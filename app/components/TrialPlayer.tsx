"use client";

import { Check, Mic, MicOff, Pause, RotateCcw, Signal, Sparkles, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SongQuest } from "../data/curriculum";
import { useMusicRecognition } from "../hooks/useMusicRecognition";
import { StaffNotation } from "./StaffNotation";

type TrialMark = "idle" | "correct" | "missed";

function normalizeTarget(value: string) {
  return value.replace("♯", "#").replace(/\s/g, "");
}

function trainingTempo(value: string) {
  const first = Number(value.match(/\d+/)?.[0] ?? 60);
  return Math.max(40, Math.min(100, first));
}

async function waveformFromRecording(blob: Blob) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();
  try {
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = audio.getChannelData(0);
    const bars = 24;
    return Array.from({ length: bars }, (_, index) => {
      const start = Math.floor(index * samples.length / bars);
      const end = Math.floor((index + 1) * samples.length / bars);
      let energy = 0;
      for (let offset = start; offset < end; offset += 1) energy += samples[offset] * samples[offset];
      const rms = Math.sqrt(energy / Math.max(1, end - start));
      return Math.max(7, Math.min(66, Math.round(7 + rms * 210)));
    });
  } finally {
    void context.close();
  }
}

export function TrialPlayer({ song }: { song: SongQuest }) {
  const isChordTrial = song.track === "singing";
  const targets = useMemo(() => {
    const source = isChordTrial ? (song.chords ?? ["C", "G", "Am", "F"]) : (song.trialNotes ?? ["E4", "G4", "B4", "E5"]);
    return Array.from({ length: 8 }, (_, index) => source[index % source.length]);
  }, [isChordTrial, song.chords, song.trialNotes]);
  const candidates = useMemo(() => [...new Set(targets)], [targets]);
  const {
    listening,
    detected,
    confidence,
    signal,
    error,
    source,
    calibration,
    aiChecking,
    aiProvider,
    aiError,
    requestAiReview,
    start: startRecognition,
    stop: stopRecognition,
    clear: clearRecognition,
  } = useMusicRecognition(isChordTrial ? "chord" : "note", candidates);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [marks, setMarks] = useState<TrialMark[]>(() => targets.map(() => "idle"));
  const [score, setScore] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingBars, setRecordingBars] = useState<number[]>([]);
  const intervalRef = useRef<number | null>(null);
  const currentIndexRef = useRef(0);
  const hitRef = useRef(false);
  const marksRef = useRef<TrialMark[]>(marks);
  const aiTargetIndexRef = useRef(-1);
  const aiCorrectedRef = useRef(new Set<number>());
  const audioRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingUrlRef = useRef("");
  const bpm = trainingTempo(song.trainingBpm);
  const beatsPerTarget = isChordTrial ? 4 : 2;

  useEffect(() => { marksRef.current = marks; }, [marks]);
  useEffect(() => {
    if (aiChecking) aiTargetIndexRef.current = currentIndexRef.current;
  }, [aiChecking]);

  const playClick = useCallback((beat: number) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audioRef.current) audioRef.current = new AudioContextClass();
    const context = audioRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = beat % beatsPerTarget === 0 ? 1040 : 690;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.17, context.currentTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.045);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.05);
  }, [beatsPerTarget]);

  const stopTrial = useCallback(() => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    stopRecognition();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, [stopRecognition]);

  useEffect(() => () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    stopRecognition();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    void audioRef.current?.close();
  }, [stopRecognition]);

  useEffect(() => {
    if (!detected || confidence < (isChordTrial ? 42 : 56)) return;
    if (source === "ai" && aiTargetIndexRef.current >= 0) {
      const targetIndex = aiTargetIndexRef.current;
      if (normalizeTarget(detected) !== normalizeTarget(targets[targetIndex]) || aiCorrectedRef.current.has(targetIndex)) return;
      aiCorrectedRef.current.add(targetIndex);
      if (running && targetIndex === currentIndexRef.current) {
        hitRef.current = true;
      } else if (marksRef.current[targetIndex] !== "correct") {
        setScore((value) => value + 1);
      }
      const aiTimer = window.setTimeout(() => {
        setMarks((items) => items.map((mark, markIndex) => markIndex === targetIndex ? "correct" : mark));
      }, 0);
      return () => window.clearTimeout(aiTimer);
    }
    if (!running) return;
    const expected = targets[currentIndexRef.current];
    if (normalizeTarget(detected) !== normalizeTarget(expected)) return;
    if (hitRef.current) return;
    hitRef.current = true;
    const index = currentIndexRef.current;
    const timer = window.setTimeout(() => {
      setMarks((items) => items.map((mark, markIndex) => markIndex === index ? "correct" : mark));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [confidence, detected, isChordTrial, running, source, targets]);

  const startTrial = async () => {
    if (running) { stopTrial(); return; }
    clearRecognition();
    const ready = await startRecognition();
    if (!ready) return;
    try {
      const recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(recordingStream);
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        if (chunks.length) {
          const clip = new Blob(chunks, { type: recorder.mimeType });
          if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
          const url = URL.createObjectURL(clip);
          recordingUrlRef.current = url;
          setRecordingUrl(url);
          void waveformFromRecording(clip).then(setRecordingBars).catch(() => setRecordingBars([]));
        }
        recordingStream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
      };
      recorder.start(); recorderRef.current = recorder; recordingStreamRef.current = recordingStream;
    } catch { /* Recognition can continue even when a browser blocks a second recording stream. */ }
    const initialMarks = targets.map(() => "idle" as TrialMark);
    setMarks(initialMarks);
    setScore(0);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    hitRef.current = false;
    aiTargetIndexRef.current = -1;
    aiCorrectedRef.current.clear();
    setRunning(true);

    let beat = 0;
    playClick(beat);
    intervalRef.current = window.setInterval(() => {
      beat += 1;
      playClick(beat);
      if (beat % beatsPerTarget !== 0) return;

      const finishedIndex = currentIndexRef.current;
      const wasCorrect = hitRef.current;
      setMarks((items) => items.map((mark, index) => index === finishedIndex ? (wasCorrect ? "correct" : "missed") : mark));
      if (wasCorrect) setScore((value) => value + 1);

      if (finishedIndex >= targets.length - 1) {
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunning(false);
        stopRecognition();
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        const finalScore = marksRef.current.filter((mark) => mark === "correct").length + (wasCorrect ? 1 : 0);
        void fetch("/api/progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            exerciseType: isChordTrial ? "song" : "fingerstyle",
            exerciseId: song.id,
            durationSeconds: Math.round(targets.length * beatsPerTarget * 60 / bpm),
            bpm,
            score: finalScore,
            track: song.track,
            stageId: song.id,
            stars: finalScore >= 7 ? 3 : finalScore >= 5 ? 2 : 1,
          }),
        });
        return;
      }

      currentIndexRef.current = finishedIndex + 1;
      setCurrentIndex(finishedIndex + 1);
      hitRef.current = false;
    }, 60_000 / bpm);
  };

  const reset = () => {
    stopTrial();
    clearRecognition();
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    hitRef.current = false;
    aiTargetIndexRef.current = -1;
    aiCorrectedRef.current.clear();
    setScore(0);
    setMarks(targets.map(() => "idle"));
  };

  return (
    <section className="trial-player" aria-label={`${song.title} 麦克风试弹`}>
      <header>
        <div><p className="eyebrow">麦克风试弹</p><h3>{isChordTrial ? "跟随和弦完成一轮" : "跟随音符完成短句"}</h3></div>
        <span className={listening ? "trial-mic live" : "trial-mic"}>{listening ? <Mic size={15} /> : <MicOff size={15} />}{calibration === "calibrating" ? "正在测底噪" : aiChecking ? `${aiProvider || "AI"} 复核中` : listening ? "正在识别" : "等待开始"}</span>
      </header>

      <div className="trial-staff">
        <StaffNotation song={song} activeIndex={currentIndex} compact />
        <div className="trial-result-row" aria-label="各音符识别结果">
          {targets.map((target, index) => (
            <span key={`${target}-${index}`} className={`${index === currentIndex ? "active " : ""}${marks[index]}`}>
              <small>{index + 1}</small><strong>{target}</strong>
              {marks[index] === "correct" ? <Check size={14} /> : marks[index] === "missed" ? <X size={14} /> : null}
            </span>
          ))}
        </div>
      </div>

      <div className="trial-readout">
        <div><span>当前目标</span><strong>{targets[currentIndex]}</strong></div>
        <div><span>麦克风听到</span><strong className={normalizeTarget(detected) === normalizeTarget(targets[currentIndex]) ? "good" : ""}>{detected || "--"}</strong></div>
        <div><span>置信度</span><strong>{confidence}%</strong></div>
        <div><span><Signal size={13} />输入信号</span><strong>{signal}%</strong></div>
        <div><span>判断来源</span><strong>{source === "ai" ? `AI · ${aiProvider}` : source === "local" ? "本机" : "--"}</strong></div>
        <div><span>正确</span><strong>{score} / 8</strong></div>
      </div>

      <div className="trial-actions">
        <button className="primary-action" onClick={startTrial}>{running ? <Pause size={17} /> : <Mic size={17} />}{running ? "暂停试弹" : "开启麦克风并试弹"}</button>
        {listening && <button className="secondary-action" onClick={requestAiReview} disabled={aiChecking || calibration !== "ready"}>{aiChecking ? <Signal size={16} /> : <Sparkles size={16} />}{aiChecking ? "AI 复核中" : "AI 复核刚才一段"}</button>}
        <button className="icon-button" onClick={reset} aria-label="重置试弹" title="重置试弹"><RotateCcw size={17} /></button>
        <p><Sparkles size={14} />{bpm} BPM · {isChordTrial ? "每 4 拍扫一次目标和弦" : "每 2 拍弹一个目标音"}</p>
      </div>
      {recordingUrl && <div className="recording-review"><div><span><Volume2 size={15} />本地录音复盘</span><div className="recording-wave">{recordingBars.map((height, index) => <i key={index} style={{ height }} />)}</div></div><audio controls src={recordingUrl} /><small>本段只保存在当前浏览器；下次试弹会替换。</small></div>}
      {error && <p className="recognition-error">{error}</p>}
      {aiError && <p className="recognition-error">AI 复核未完成：{aiError}</p>}
      <small className="trial-disclaimer">{isChordTrial ? "识别器评估吉他和弦，不评估歌声。" : `${song.trialSource ?? "原创技术片段"}，用于音准和节拍检测。`}</small>
    </section>
  );
}
