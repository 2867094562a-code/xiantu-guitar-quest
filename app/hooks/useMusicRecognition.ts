"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecognitionKind = "chord" | "note";

const CHORD_TEMPLATES: Record<string, number[]> = {
  C: [0, 4, 7],
  Cm: [0, 3, 7],
  D: [2, 6, 9],
  Dm: [2, 5, 9],
  E: [4, 8, 11],
  Em: [4, 7, 11],
  F: [5, 9, 0],
  Fmaj7: [5, 9, 0, 4],
  G: [7, 11, 2],
  A: [9, 1, 4],
  Am: [9, 0, 4],
  Bm: [11, 2, 6],
};

function canonicalChord(value: string) {
  if (value === "小 F") return "F";
  return value.replace(/\s/g, "");
}

function rmsOf(buffer: Float32Array) {
  let sum = 0;
  for (let index = 0; index < buffer.length; index += 1) sum += buffer[index] * buffer[index];
  return Math.sqrt(sum / buffer.length);
}

function recognizeChord(frequencies: Float32Array, sampleRate: number, fftSize: number, candidates: string[]) {
  const chroma = new Array(12).fill(0) as number[];
  const binHz = sampleRate / fftSize;
  for (let bin = Math.ceil(65 / binHz); bin < frequencies.length; bin += 1) {
    const frequency = bin * binHz;
    if (frequency > 1250) break;
    const decibels = frequencies[bin];
    if (!Number.isFinite(decibels) || decibels < -76) continue;
    const midi = 69 + 12 * Math.log2(frequency / 440);
    const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
    const energy = Math.pow(10, (decibels + 76) / 28) / Math.sqrt(frequency / 82);
    chroma[pitchClass] += energy;
  }

  const total = chroma.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return { label: "", confidence: 0 };
  const normalized = chroma.map((value) => value / total);
  const pool = [...new Set(candidates.map(canonicalChord).filter((name) => CHORD_TEMPLATES[name]))];
  const chordPool = pool.length ? pool : Object.keys(CHORD_TEMPLATES);
  const scored = chordPool.map((label) => {
    const notes = CHORD_TEMPLATES[label];
    const chordEnergy = notes.reduce((sum, note, index) => sum + normalized[note] * (index === 0 ? 1.25 : 1), 0);
    const outsideEnergy = normalized.reduce((sum, value, note) => notes.includes(note) ? sum : sum + value, 0);
    const rootSupport = normalized[notes[0]];
    return { label, score: chordEnergy - outsideEnergy * 0.16 + rootSupport * 0.22 };
  }).sort((a, b) => b.score - a.score);
  const best = scored[0];
  const gap = best.score - (scored[1]?.score ?? 0);
  const confidence = Math.round(Math.max(0, Math.min(99, (best.score * 115 + gap * 130))));
  if (best.score < 0.28 || confidence < 48) return { label: "", confidence };
  const originalLabel = candidates.find((candidate) => canonicalChord(candidate) === best.label) ?? best.label;
  return { label: originalLabel, confidence };
}

function recognizePitch(buffer: Float32Array, sampleRate: number) {
  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.min(Math.floor(sampleRate / 70), Math.floor(buffer.length / 2));
  const windowSize = Math.min(1400, buffer.length - maxLag);
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

  if (bestLag <= 0 || bestCorrelation < 0.64) return { label: "", confidence: Math.round(bestCorrelation * 100) };
  const frequency = sampleRate / bestLag;
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const label = `${notes[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  return { label, confidence: Math.round(Math.min(99, bestCorrelation * 100)) };
}

export function useMusicRecognition(kind: RecognitionKind, candidates: string[] = []) {
  const [listening, setListening] = useState(false);
  const [detected, setDetected] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [signal, setSignal] = useState(0);
  const [error, setError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const latestConfigRef = useRef({ kind, candidates });
  const stabilityRef = useRef({ label: "", count: 0 });
  const lastResultRef = useRef(0);
  const lastAnalysisRef = useRef(0);

  useEffect(() => { latestConfigRef.current = { kind, candidates }; }, [candidates, kind]);

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void contextRef.current?.close();
    frameRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
    setListening(false);
  }, []);

  const clear = useCallback(() => {
    stabilityRef.current = { label: "", count: 0 };
    setDetected("");
    setConfidence(0);
    setSignal(0);
    setError("");
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    if (streamRef.current) return true;
    try {
      clear();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false },
      });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      const analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      analyser.minDecibels = -92;
      analyser.maxDecibels = -8;
      analyser.smoothingTimeConstant = 0.3;
      context.createMediaStreamSource(stream).connect(analyser);
      const timeData = new Float32Array(analyser.fftSize);
      const frequencyData = new Float32Array(analyser.frequencyBinCount);
      streamRef.current = stream;
      contextRef.current = context;
      setListening(true);

      const analyze = (timestamp: number) => {
        if (timestamp - lastAnalysisRef.current >= 95) {
          lastAnalysisRef.current = timestamp;
          analyser.getFloatTimeDomainData(timeData);
          const rms = rmsOf(timeData);
          setSignal(Math.min(100, Math.round((rms / 0.085) * 100)));
          let result = { label: "", confidence: 0 };
          if (rms >= 0.011) {
            if (latestConfigRef.current.kind === "chord") {
              analyser.getFloatFrequencyData(frequencyData);
              result = recognizeChord(frequencyData, context.sampleRate, analyser.fftSize, latestConfigRef.current.candidates);
            } else {
              result = recognizePitch(timeData, context.sampleRate);
            }
          }

          if (result.label) {
            const stable = stabilityRef.current;
            stabilityRef.current = stable.label === result.label
              ? { label: result.label, count: stable.count + 1 }
              : { label: result.label, count: 1 };
            if (stabilityRef.current.count >= 2) {
              setDetected(result.label);
              setConfidence(result.confidence);
              lastResultRef.current = timestamp;
            }
          } else if (timestamp - lastResultRef.current > 850) {
            stabilityRef.current = { label: "", count: 0 };
            setDetected("");
            setConfidence(0);
          }
        }
        frameRef.current = requestAnimationFrame(analyze);
      };
      frameRef.current = requestAnimationFrame(analyze);
      return true;
    } catch {
      setError("没有获得麦克风权限，请允许浏览器使用麦克风后再试。");
      setListening(false);
      return false;
    }
  }, [clear]);

  return { listening, detected, confidence, signal, error, start, stop, clear };
}
