"use client";

import { Check, Mic, MicOff, Pause, RotateCcw, Signal, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SongQuest } from "../data/curriculum";
import { useMusicRecognition } from "../hooks/useMusicRecognition";

type TrialMark = "idle" | "correct" | "missed";

function normalizeTarget(value: string) {
  return value.replace("♯", "#").replace(/\s/g, "");
}

function trainingTempo(value: string) {
  const first = Number(value.match(/\d+/)?.[0] ?? 60);
  return Math.max(40, Math.min(100, first));
}

export function TrialPlayer({ song }: { song: SongQuest }) {
  const isChordTrial = song.track === "singing";
  const targets = useMemo(() => {
    const source = isChordTrial ? (song.chords ?? ["C", "G", "Am", "F"]) : (song.trialNotes ?? ["E4", "G4", "B4", "E5"]);
    return Array.from({ length: 8 }, (_, index) => source[index % source.length]);
  }, [isChordTrial, song.chords, song.trialNotes]);
  const candidates = useMemo(() => isChordTrial ? [...new Set(targets)] : [], [isChordTrial, targets]);
  const {
    listening,
    detected,
    confidence,
    signal,
    error,
    start: startRecognition,
    stop: stopRecognition,
    clear: clearRecognition,
  } = useMusicRecognition(isChordTrial ? "chord" : "note", candidates);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [marks, setMarks] = useState<TrialMark[]>(() => targets.map(() => "idle"));
  const [score, setScore] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const currentIndexRef = useRef(0);
  const hitRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const bpm = trainingTempo(song.trainingBpm);
  const beatsPerTarget = isChordTrial ? 4 : 2;

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
  }, [stopRecognition]);

  useEffect(() => () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    stopRecognition();
    void audioRef.current?.close();
  }, [stopRecognition]);

  useEffect(() => {
    if (!running || !detected || confidence < (isChordTrial ? 50 : 68)) return;
    const expected = targets[currentIndexRef.current];
    if (normalizeTarget(detected) !== normalizeTarget(expected)) return;
    if (hitRef.current) return;
    hitRef.current = true;
    const index = currentIndexRef.current;
    const timer = window.setTimeout(() => {
      setMarks((items) => items.map((mark, markIndex) => markIndex === index ? "correct" : mark));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [confidence, detected, isChordTrial, running, targets]);

  const startTrial = async () => {
    if (running) { stopTrial(); return; }
    clearRecognition();
    const ready = await startRecognition();
    if (!ready) return;
    const initialMarks = targets.map(() => "idle" as TrialMark);
    setMarks(initialMarks);
    setScore(0);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    hitRef.current = false;
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
    setScore(0);
    setMarks(targets.map(() => "idle"));
  };

  return (
    <section className="trial-player" aria-label={`${song.title} 麦克风试弹`}>
      <header>
        <div><p className="eyebrow">麦克风试弹</p><h3>{isChordTrial ? "跟随和弦完成一轮" : "跟随音符完成短句"}</h3></div>
        <span className={listening ? "trial-mic live" : "trial-mic"}>{listening ? <Mic size={15} /> : <MicOff size={15} />}{listening ? "正在识别" : "等待开始"}</span>
      </header>

      <div className={isChordTrial ? "trial-sequence chords" : "trial-sequence notes"}>
        {targets.map((target, index) => (
          <span key={`${target}-${index}`} className={`${index === currentIndex ? "active " : ""}${marks[index]}`}>
            <small>{index + 1}</small>
            <strong>{target}</strong>
            {marks[index] === "correct" ? <Check size={14} /> : marks[index] === "missed" ? <X size={14} /> : null}
          </span>
        ))}
      </div>

      <div className="trial-readout">
        <div><span>当前目标</span><strong>{targets[currentIndex]}</strong></div>
        <div><span>麦克风听到</span><strong className={normalizeTarget(detected) === normalizeTarget(targets[currentIndex]) ? "good" : ""}>{detected || "--"}</strong></div>
        <div><span>置信度</span><strong>{confidence}%</strong></div>
        <div><span><Signal size={13} />输入信号</span><strong>{signal}%</strong></div>
        <div><span>正确</span><strong>{score} / 8</strong></div>
      </div>

      <div className="trial-actions">
        <button className="primary-action" onClick={startTrial}>{running ? <Pause size={17} /> : <Mic size={17} />}{running ? "暂停试弹" : "开启麦克风并试弹"}</button>
        <button className="icon-button" onClick={reset} aria-label="重置试弹" title="重置试弹"><RotateCcw size={17} /></button>
        <p><Sparkles size={14} />{bpm} BPM · {isChordTrial ? "每 4 拍扫一次目标和弦" : "每 2 拍弹一个目标音"}</p>
      </div>
      {error && <p className="recognition-error">{error}</p>}
      <small className="trial-disclaimer">{isChordTrial ? "识别器评估吉他和弦，不评估歌声。" : `${song.trialSource ?? "原创技术片段"}，用于音准和节拍检测。`}</small>
    </section>
  );
}
