"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadLocalAiSettings, type AiProvider } from "../lib/local-ai-settings";

export type RecognitionKind = "chord" | "note" | "attack";
export type RecognitionSource = "" | "local" | "ai";
export type CalibrationState = "idle" | "calibrating" | "ready";

const CHORD_TEMPLATES: Record<string, number[]> = {
  C: [0, 4, 7], Cm: [0, 3, 7], D: [2, 6, 9], Dm: [2, 5, 9],
  E: [4, 8, 11], Em: [4, 7, 11], F: [5, 9, 0], Fmaj7: [5, 9, 0, 4],
  G: [7, 11, 2], A: [9, 1, 4], Am: [9, 0, 4], Bm: [11, 2, 6],
};

function canonicalChord(value: string) {
  if (value === "小 F") return "F";
  return value.replace(/\s/g, "");
}

function normalizeLabel(value: string) {
  return value.replace("♯", "#").replace(/\s/g, "").toLowerCase();
}

function rmsOf(buffer: Float32Array) {
  let sum = 0;
  for (let index = 0; index < buffer.length; index += 1) sum += buffer[index] * buffer[index];
  return Math.sqrt(sum / buffer.length);
}

function recognizeChord(frequencies: Float32Array, sampleRate: number, fftSize: number, candidates: string[]) {
  const chroma = new Array(12).fill(0) as number[];
  const binHz = sampleRate / fftSize;
  for (let bin = Math.ceil(65 / binHz); bin < frequencies.length - 1; bin += 1) {
    const frequency = bin * binHz;
    if (frequency > 1500) break;
    const decibels = frequencies[bin];
    if (!Number.isFinite(decibels) || decibels < -86) continue;
    if (decibels < frequencies[bin - 1] || decibels < frequencies[bin + 1]) continue;
    const midi = 69 + 12 * Math.log2(frequency / 440);
    const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
    const energy = Math.pow(10, (decibels + 86) / 24) / Math.pow(frequency / 82, 0.38);
    chroma[pitchClass] += energy;
  }

  const total = chroma.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return { label: "", confidence: 0 };
  const normalized = chroma.map((value) => value / total);
  const pool = [...new Set(candidates.map(canonicalChord).filter((name) => CHORD_TEMPLATES[name]))];
  const chordPool = pool.length ? pool : Object.keys(CHORD_TEMPLATES);
  const scored = chordPool.map((label) => {
    const notes = CHORD_TEMPLATES[label];
    const chordEnergy = notes.reduce((sum, note, index) => sum + normalized[note] * (index === 0 ? 1.16 : 1), 0);
    const outsideEnergy = normalized.reduce((sum, value, note) => notes.includes(note) ? sum : sum + value, 0);
    return { label, score: chordEnergy - outsideEnergy * 0.12 + normalized[notes[0]] * 0.18 };
  }).sort((a, b) => b.score - a.score);
  const best = scored[0];
  const gap = best.score - (scored[1]?.score ?? 0);
  const confidence = Math.round(Math.max(0, Math.min(99, best.score * 128 + gap * 120)));
  if (best.score < 0.19 || confidence < 38) return { label: "", confidence };
  const originalLabel = candidates.find((candidate) => canonicalChord(candidate) === best.label) ?? best.label;
  return { label: originalLabel, confidence };
}

function recognizePitch(buffer: Float32Array, sampleRate: number) {
  const minLag = Math.floor(sampleRate / 1100);
  const maxLag = Math.min(Math.floor(sampleRate / 65), Math.floor(buffer.length / 2));
  const windowSize = Math.min(1700, buffer.length - maxLag);
  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let product = 0;
    let energyA = 0;
    let energyB = 0;
    for (let index = 0; index < windowSize; index += 2) {
      const a = buffer[index];
      const b = buffer[index + lag];
      product += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    const correlation = product / Math.sqrt(Math.max(0.000001, energyA * energyB));
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || bestCorrelation < 0.52) return { label: "", confidence: Math.round(bestCorrelation * 100) };
  const frequency = sampleRate / bestLag;
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const label = `${notes[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  return { label, confidence: Math.round(Math.min(99, bestCorrelation * 100)) };
}

function encodeRecentWav(chunks: Float32Array[], sampleRate: number, seconds = 3) {
  const wanted = Math.min(Math.floor(sampleRate * seconds), chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  if (wanted < sampleRate * 0.7) return "";
  const pcm = new Float32Array(wanted);
  let writeAt = wanted;
  for (let index = chunks.length - 1; index >= 0 && writeAt > 0; index -= 1) {
    const chunk = chunks[index];
    const take = Math.min(writeAt, chunk.length);
    writeAt -= take;
    pcm.set(chunk.subarray(chunk.length - take), writeAt);
  }

  const targetRate = 16_000;
  const ratio = sampleRate / targetRate;
  const outputLength = Math.floor(pcm.length / ratio);
  const buffer = new ArrayBuffer(44 + outputLength * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, value: string) => Array.from(value).forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  writeText(0, "RIFF"); view.setUint32(4, 36 + outputLength * 2, true); writeText(8, "WAVE");
  writeText(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true); view.setUint32(28, targetRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeText(36, "data"); view.setUint32(40, outputLength * 2, true);
  for (let index = 0; index < outputLength; index += 1) {
    const sample = Math.max(-1, Math.min(1, pcm[Math.floor(index * ratio)]));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

export function useMusicRecognition(kind: RecognitionKind, candidates: string[] = []) {
  const [listening, setListening] = useState(false);
  const [detected, setDetected] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [signal, setSignal] = useState(0);
  const [error, setError] = useState("");
  const [source, setSource] = useState<RecognitionSource>("");
  const [calibration, setCalibration] = useState<CalibrationState>("idle");
  const [aiChecking, setAiChecking] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProvider | "">("");
  const [aiError, setAiError] = useState("");
  const [onsetCount, setOnsetCount] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const captureRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const latestConfigRef = useRef({ kind, candidates });
  const stabilityRef = useRef({ label: "", count: 0 });
  const lastResultRef = useRef(0);
  const lastAnalysisRef = useRef(0);
  const noiseSamplesRef = useRef<number[]>([]);
  const noiseFloorRef = useRef(0.0025);
  const calibrationStartedRef = useRef(0);
  const signalActiveSinceRef = useRef(0);
  const signalEvidenceRef = useRef(0);
  const lastSignalAtRef = useRef(0);
  const recentPcmRef = useRef<Float32Array[]>([]);
  const recentPcmLengthRef = useRef(0);
  const aiLastAttemptRef = useRef(0);
  const aiInFlightRef = useRef(false);
  const previousRmsRef = useRef(0);
  const lastOnsetRef = useRef(0);

  useEffect(() => { latestConfigRef.current = { kind, candidates }; }, [candidates, kind]);

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    captureRef.current?.disconnect();
    void contextRef.current?.close();
    frameRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
    captureRef.current = null;
    setListening(false);
    setCalibration("idle");
  }, []);

  const clear = useCallback(() => {
    stabilityRef.current = { label: "", count: 0 };
    setDetected("");
    setConfidence(0);
    setSignal(0);
    setError("");
    setSource("");
    setAiChecking(false);
    setAiProvider("");
    setAiError("");
    setOnsetCount(0);
    lastResultRef.current = 0;
    lastAnalysisRef.current = 0;
    previousRmsRef.current = 0;
    lastOnsetRef.current = 0;
    signalEvidenceRef.current = 0;
    lastSignalAtRef.current = 0;
    signalActiveSinceRef.current = 0;
  }, []);

  useEffect(() => () => stop(), [stop]);

  const runAiReview = useCallback(async () => {
    const settings = loadLocalAiSettings();
    const current = latestConfigRef.current;
    if (!settings.enabled || !settings.autoReview || !settings.apiKey || !current.candidates.length || aiInFlightRef.current) return;
    const context = contextRef.current;
    if (!context) return;
    const audioBase64 = encodeRecentWav(recentPcmRef.current, context.sampleRate);
    if (!audioBase64) return;
    aiInFlightRef.current = true;
    aiLastAttemptRef.current = performance.now();
    setAiChecking(true);
    setAiProvider(settings.provider);
    setAiError("");
    try {
      const response = await fetch("/api/ai-recognition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey: settings.apiKey,
          model: settings.model,
          kind: current.kind,
          candidates: current.candidates,
          audioBase64,
        }),
      });
      const result = await response.json() as { detected?: string; confidence?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "AI 复核失败");
      const matched = current.candidates.find((candidate) => normalizeLabel(candidate) === normalizeLabel(result.detected ?? ""));
      if (matched && (result.confidence ?? 0) >= 42) {
        setDetected(matched);
        setConfidence(Math.min(99, Math.max(0, Math.round(result.confidence ?? 0))));
        setSource("ai");
        lastResultRef.current = performance.now();
      }
    } catch (reviewError) {
      setAiError(reviewError instanceof Error ? reviewError.message : "AI 复核失败");
    } finally {
      aiInFlightRef.current = false;
      setAiChecking(false);
    }
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return true;
    let requestedStream: MediaStream | null = null;
    let requestedContext: AudioContext | null = null;
    try {
      clear();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false, channelCount: 1 },
      });
      requestedStream = stream;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      requestedContext = context;
      await context.resume();
      const analyser = context.createAnalyser();
      analyser.fftSize = 8192;
      analyser.minDecibels = -96;
      analyser.maxDecibels = -8;
      analyser.smoothingTimeConstant = 0.42;
      const sourceNode = context.createMediaStreamSource(stream);
      sourceNode.connect(analyser);

      const appendPcm = (chunk: Float32Array) => {
        const copy = new Float32Array(chunk);
        recentPcmRef.current.push(copy);
        recentPcmLengthRef.current += copy.length;
        const maxSamples = context.sampleRate * 4;
        while (recentPcmLengthRef.current > maxSamples && recentPcmRef.current.length > 1) {
          recentPcmLengthRef.current -= recentPcmRef.current.shift()?.length ?? 0;
        }
      };

      try {
        await context.audioWorklet.addModule("/pcm-capture-worklet.js");
        const capture = new AudioWorkletNode(context, "xiantu-pcm-capture");
        capture.port.onmessage = (event: MessageEvent<Float32Array>) => appendPcm(event.data);
        const silent = context.createGain();
        silent.gain.value = 0;
        sourceNode.connect(capture).connect(silent).connect(context.destination);
        captureRef.current = capture;
      } catch {
        const capture = context.createScriptProcessor(4096, 1, 1);
        const silent = context.createGain();
        silent.gain.value = 0;
        capture.onaudioprocess = (event) => appendPcm(event.inputBuffer.getChannelData(0));
        sourceNode.connect(capture).connect(silent).connect(context.destination);
        captureRef.current = capture;
      }

      const timeData = new Float32Array(analyser.fftSize);
      const frequencyData = new Float32Array(analyser.frequencyBinCount);
      streamRef.current = stream;
      contextRef.current = context;
      recentPcmRef.current = [];
      recentPcmLengthRef.current = 0;
      noiseSamplesRef.current = [];
      calibrationStartedRef.current = performance.now();
      signalActiveSinceRef.current = 0;
      aiLastAttemptRef.current = 0;
      setCalibration("calibrating");
      setListening(true);

      const analyze = (timestamp: number) => {
        if (timestamp - lastAnalysisRef.current >= 75) {
          lastAnalysisRef.current = timestamp;
          analyser.getFloatTimeDomainData(timeData);
          const rms = rmsOf(timeData);
          const calibrating = timestamp - calibrationStartedRef.current < 950;
          if (calibrating) {
            noiseSamplesRef.current.push(rms);
          } else if (noiseSamplesRef.current.length) {
            const sorted = [...noiseSamplesRef.current].sort((a, b) => a - b);
            noiseFloorRef.current = Math.max(0.00045, sorted[Math.floor(sorted.length * 0.7)] ?? 0.0025);
            noiseSamplesRef.current = [];
            setCalibration("ready");
          }

          const threshold = Math.max(0.0018, Math.min(0.018, noiseFloorRef.current * 2.8 + 0.0007));
          const signalPercent = Math.min(100, Math.round((Math.max(0, rms - noiseFloorRef.current) / Math.max(0.012, threshold * 4)) * 100));
          setSignal(signalPercent);
          let result = { label: "", confidence: 0 };
          if (!calibrating && rms >= threshold) {
            if (!signalActiveSinceRef.current) signalActiveSinceRef.current = timestamp;
            signalEvidenceRef.current = Math.min(2_500, signalEvidenceRef.current + 75);
            lastSignalAtRef.current = timestamp;
            if (latestConfigRef.current.kind === "attack") {
              const rising = rms > Math.max(threshold * 1.22, previousRmsRef.current * 1.42);
              if (rising && timestamp - lastOnsetRef.current > 135) {
                lastOnsetRef.current = timestamp;
                setOnsetCount((value) => value + 1);
              }
            } else if (latestConfigRef.current.kind === "chord") {
              analyser.getFloatFrequencyData(frequencyData);
              result = recognizeChord(frequencyData, context.sampleRate, analyser.fftSize, latestConfigRef.current.candidates);
            } else {
              result = recognizePitch(timeData, context.sampleRate);
            }
          } else if (!calibrating) {
            if (timestamp - lastSignalAtRef.current > 850) {
              signalActiveSinceRef.current = 0;
              signalEvidenceRef.current = 0;
            }
          }

          if (result.label) {
            const stable = stabilityRef.current;
            stabilityRef.current = stable.label === result.label ? { label: result.label, count: stable.count + 1 } : { label: result.label, count: 1 };
            if (stabilityRef.current.count >= 2) {
              setDetected(result.label);
              setConfidence(result.confidence);
              setSource("local");
              lastResultRef.current = timestamp;
              signalActiveSinceRef.current = 0;
              signalEvidenceRef.current = 0;
            }
          } else {
            const activeLongEnough = signalEvidenceRef.current >= 450 && timestamp - lastSignalAtRef.current < 850;
            const aiReady = timestamp - aiLastAttemptRef.current > 4_000 && timestamp - lastResultRef.current > 1_100;
            if (latestConfigRef.current.kind !== "attack" && activeLongEnough && aiReady) {
              signalEvidenceRef.current = 0;
              signalActiveSinceRef.current = 0;
              void runAiReview();
            }
            if (timestamp - lastResultRef.current > 1_050) {
              stabilityRef.current = { label: "", count: 0 };
              setDetected("");
              setConfidence(0);
              setSource("");
            }
          }
          previousRmsRef.current = rms;
        }
        frameRef.current = requestAnimationFrame(analyze);
      };
      frameRef.current = requestAnimationFrame(analyze);
      return true;
    } catch {
      requestedStream?.getTracks().forEach((track) => track.stop());
      void requestedContext?.close();
      setError("没有获得麦克风权限，请允许浏览器使用麦克风后再试。建议把吉他音孔对准麦克风，距离约 30-60 厘米。");
      setListening(false);
      setCalibration("idle");
      return false;
    }
  }, [clear, runAiReview]);

  return {
    listening, detected, confidence, signal, error, source, calibration,
    aiChecking, aiProvider, aiError, onsetCount, start, stop, clear, requestAiReview: runAiReview,
  };
}
