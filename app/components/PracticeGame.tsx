"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Check,
  CircleCheck,
  Cloud,
  Dumbbell,
  Gauge,
  Guitar,
  Hand,
  HeartPulse,
  ListChecks,
  Mic,
  MicOff,
  Minus,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TimerReset,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chordPairs, songQuests, spiderPatterns, strumPatterns } from "../data/curriculum";
import { useMusicRecognition } from "../hooks/useMusicRecognition";
import { usePositiveFeedback } from "../hooks/usePositiveFeedback";
import { AppShell } from "./AppShell";
import { ChordDiagram } from "./ChordDiagram";
import { AudioCalibrationWizard } from "./AudioCalibrationWizard";

type ExerciseId = "tune" | "spider" | "chord" | "strum" | "rhythm" | "song" | "review";
type SessionMode = "练习" | "休息";

type DailyPracticeSnapshot = {
  goal: number;
  activeTask: ExerciseId;
  completed: ExerciseId[];
  bpm: number;
  duration: number;
  sets: number;
  rest: number;
  pattern: string;
  pain: number;
  sessionMode: SessionMode;
  secondsLeft: number;
  currentSet: number;
  sessionDone: boolean;
  chordPair: string;
  beatsPerChord: number;
  chordDuration: number;
  cleanSwitches: number;
  strumPattern: string;
  strumDuration: number;
  strumHits: number;
  strumExtras: number;
  reviewNote: string;
};

const planMinutes: Record<number, Record<ExerciseId, number>> = {
  60: { tune: 5, spider: 8, chord: 10, strum: 10, rhythm: 7, song: 15, review: 5 },
  90: { tune: 7, spider: 12, chord: 16, strum: 15, rhythm: 10, song: 22, review: 8 },
  120: { tune: 10, spider: 15, chord: 22, strum: 20, rhythm: 15, song: 28, review: 10 },
};

const taskMeta: Array<{ id: ExerciseId; title: string; detail: string; icon: typeof Guitar }> = [
  { id: "tune", title: "调音与放松", detail: "逐弦调准，肩、腕与拇指不夹紧", icon: HeartPulse },
  { id: "spider", title: "稳拍爬格子", detail: "短组练习，在酸胀出现前结束", icon: Hand },
  { id: "chord", title: "和弦转换", detail: "用完整拍位换和弦，不追求蛮力", icon: Dumbbell },
  { id: "strum", title: "扫弦训练", detail: "上下扫、空拍与重音都落在正确细分", icon: ArrowDown },
  { id: "rhythm", title: "节奏听练", detail: "四分与八分音符，口数拍子", icon: Gauge },
  { id: "song", title: "中文歌分段", detail: "技术落进歌曲，只练一个明确段落", icon: Music2 },
  { id: "review", title: "录音复盘", detail: "记录一处进步和一个明日重点", icon: ListChecks },
];

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function usePracticeClick(bpm: number, enabled: boolean, accentEvery = 4, subdivisions = 1) {
  const [beat, setBeat] = useState(0);
  const contextRef = useRef<AudioContext | null>(null);

  const playClick = useCallback((index: number) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!contextRef.current) contextRef.current = new AudioContextClass();
    const context = contextRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const fullBeat = index % subdivisions === 0;
    const beatIndex = Math.floor(index / subdivisions);
    oscillator.frequency.value = fullBeat ? (beatIndex % accentEvery === 0 ? 1120 : 760) : 540;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(fullBeat ? 0.24 : 0.1, context.currentTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.055);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.06);
  }, [accentEvery, subdivisions]);

  useEffect(() => {
    if (!enabled) return;
    let current = 0;
    playClick(current);
    const timer = window.setInterval(() => {
      current += 1;
      setBeat(current);
      playClick(current);
    }, 60000 / bpm / subdivisions);
    return () => window.clearInterval(timer);
  }, [bpm, enabled, playClick, subdivisions]);

  useEffect(() => () => { contextRef.current?.close(); }, []);
  return enabled ? beat : 0;
}

function NumberStepper({ label, value, min, max, step = 1, suffix, disabled = false, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; suffix: string; disabled?: boolean; onChange: (value: number) => void;
}) {
  return (
    <div className="number-stepper">
      <span>{label}</span>
      <div>
        <button disabled={disabled} aria-label={`减少${label}`} onClick={() => onChange(Math.max(min, value - step))}><Minus size={15} /></button>
        <strong>{value}<small>{suffix}</small></strong>
        <button disabled={disabled} aria-label={`增加${label}`} onClick={() => onChange(Math.min(max, value + step))}><Plus size={15} /></button>
      </div>
    </div>
  );
}

export function PracticeGame() {
  const [goal, setGoal] = useState(60);
  const [activeTask, setActiveTask] = useState<ExerciseId>("spider");
  const [completed, setCompleted] = useState<ExerciseId[]>([]);
  const [bpm, setBpm] = useState(60);
  const [duration, setDuration] = useState(45);
  const [sets, setSets] = useState(3);
  const [rest, setRest] = useState(75);
  const [pattern, setPattern] = useState("1234");
  const [pain, setPain] = useState(1);
  const [running, setRunning] = useState(false);
  const [sessionMode, setSessionMode] = useState<SessionMode>("练习");
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [currentSet, setCurrentSet] = useState(1);
  const [sessionDone, setSessionDone] = useState(false);
  const [chordPair, setChordPair] = useState("em-am");
  const [beatsPerChord, setBeatsPerChord] = useState(4);
  const [chordDuration, setChordDuration] = useState(60);
  const [cleanSwitches, setCleanSwitches] = useState(0);
  const [strumPattern, setStrumPattern] = useState("quarter-down");
  const [strumDuration, setStrumDuration] = useState(60);
  const [strumHits, setStrumHits] = useState(0);
  const [strumExtras, setStrumExtras] = useState(0);
  const [reviewNote, setReviewNote] = useState("");
  const [preparationSeconds, setPreparationSeconds] = useState(0);
  const { feedback, celebrate, resetFeedback } = usePositiveFeedback();
  const [memoryReady, setMemoryReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"loading" | "synced" | "local" | "failed">("loading");
  const cleanSwitchesRef = useRef(0);
  const lastCloudSyncRef = useRef(0);
  const practiceDateRef = useRef(localDateKey());
  const recognizedPhaseRef = useRef(-1);
  const chordAiTargetRef = useRef({ phase: -1, chord: "" });
  const recognizedStrumPhaseRef = useRef(-1);
  const lastOnsetCountRef = useRef(0);
  const strumFinishLockRef = useRef(false);
  const isPreparing = preparationSeconds > 0;
  const beat = usePracticeClick(bpm, running && sessionMode === "练习" && !isPreparing, 4, activeTask === "strum" ? 2 : 1);
  const selectedPair = chordPairs.find((pair) => pair.id === chordPair) ?? chordPairs[0];
  const selectedPattern = spiderPatterns.find((item) => item.id === pattern) ?? spiderPatterns[0];
  const selectedStrum = strumPatterns.find((item) => item.id === strumPattern) ?? strumPatterns[0];
  const chordCandidates = useMemo(() => [selectedPair.from, selectedPair.to], [selectedPair.from, selectedPair.to]);
  const {
    listening: chordListening,
    detected: detectedChord,
    confidence: chordConfidence,
    error: chordError,
    start: startChordRecognition,
    stop: stopChordRecognition,
    clear: clearChordRecognition,
    source: chordSource,
    calibration: chordCalibration,
    aiChecking: chordAiChecking,
    aiProvider: chordAiProvider,
    aiError: chordAiError,
    requestAiReview: requestChordAiReview,
  } = useMusicRecognition("chord", chordCandidates);
  const {
    listening: strumListening,
    signal: strumSignal,
    error: strumError,
    calibration: strumCalibration,
    onsetCount: strumOnsetCount,
    start: startStrumRecognition,
    stop: stopStrumRecognition,
    clear: clearStrumRecognition,
  } = useMusicRecognition("attack");

  const plan = planMinutes[goal];
  const totalDone = completed.reduce((sum, id) => sum + plan[id], 0);
  const dailyProgress = Math.round((totalDone / goal) * 100);
  const currentDuration = activeTask === "chord" ? chordDuration : activeTask === "strum" ? strumDuration : duration;
  const progress = sessionMode === "休息"
    ? ((rest - secondsLeft) / rest) * 100
    : ((currentDuration - secondsLeft) / currentDuration) * 100;

  const currentChord = useMemo(() => {
    const phase = Math.floor(beat / beatsPerChord) % 2;
    return phase === 0 ? selectedPair.from : selectedPair.to;
  }, [beat, beatsPerChord, selectedPair]);
  const currentChordPhase = Math.floor(beat / beatsPerChord);

  const applySnapshot = useCallback((snapshot: Partial<DailyPracticeSnapshot>) => {
    if ([60, 90, 120].includes(snapshot.goal ?? 0)) setGoal(snapshot.goal!);
    if (taskMeta.some((task) => task.id === snapshot.activeTask)) setActiveTask(snapshot.activeTask!);
    if (Array.isArray(snapshot.completed)) setCompleted(snapshot.completed.filter((id) => taskMeta.some((task) => task.id === id)));
    if (typeof snapshot.bpm === "number") setBpm(Math.min(120, Math.max(30, snapshot.bpm)));
    if (typeof snapshot.duration === "number") setDuration(Math.min(120, Math.max(20, snapshot.duration)));
    if (typeof snapshot.sets === "number") setSets(Math.min(6, Math.max(1, snapshot.sets)));
    if (typeof snapshot.rest === "number") setRest(Math.min(120, Math.max(30, snapshot.rest)));
    if (spiderPatterns.some((item) => item.id === snapshot.pattern)) setPattern(snapshot.pattern!);
    if (typeof snapshot.pain === "number") setPain(Math.min(10, Math.max(0, snapshot.pain)));
    if (snapshot.sessionMode === "练习" || snapshot.sessionMode === "休息") setSessionMode(snapshot.sessionMode);
    if (typeof snapshot.secondsLeft === "number") setSecondsLeft(Math.max(0, Math.round(snapshot.secondsLeft)));
    if (typeof snapshot.currentSet === "number") setCurrentSet(Math.min(6, Math.max(1, snapshot.currentSet)));
    if (typeof snapshot.sessionDone === "boolean") setSessionDone(snapshot.sessionDone);
    if (chordPairs.some((pair) => pair.id === snapshot.chordPair)) setChordPair(snapshot.chordPair!);
    if ([1, 2, 4].includes(snapshot.beatsPerChord ?? 0)) setBeatsPerChord(snapshot.beatsPerChord!);
    if (typeof snapshot.chordDuration === "number") setChordDuration(Math.min(300, Math.max(30, snapshot.chordDuration)));
    if (typeof snapshot.cleanSwitches === "number") setCleanSwitches(Math.max(0, snapshot.cleanSwitches));
    if (strumPatterns.some((item) => item.id === snapshot.strumPattern)) setStrumPattern(snapshot.strumPattern!);
    if (typeof snapshot.strumDuration === "number") setStrumDuration(Math.min(300, Math.max(30, snapshot.strumDuration)));
    if (typeof snapshot.strumHits === "number") setStrumHits(Math.max(0, snapshot.strumHits));
    if (typeof snapshot.strumExtras === "number") setStrumExtras(Math.max(0, snapshot.strumExtras));
    if (typeof snapshot.reviewNote === "string") setReviewNote(snapshot.reviewNote.slice(0, 1000));
    setRunning(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const storageKey = `xiantu-daily-${practiceDateRef.current}`;
    let localUpdatedAt = 0;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as { state?: Partial<DailyPracticeSnapshot>; updatedAt?: number };
        localUpdatedAt = saved.updatedAt ?? 0;
        window.setTimeout(() => { if (!cancelled && saved.state) applySnapshot(saved.state); }, 0);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }

    fetch(`/api/daily-state?date=${practiceDateRef.current}`)
      .then((response) => response.json())
      .then((data: { signedIn?: boolean; persistenceAvailable?: boolean; state?: Partial<DailyPracticeSnapshot> | null; updatedAt?: number }) => {
        if (!cancelled && data.state && (data.updatedAt ?? 0) > localUpdatedAt) applySnapshot(data.state);
        if (!cancelled) setSyncStatus(data.signedIn && data.persistenceAvailable !== false ? "synced" : "local");
      })
      .catch(() => { if (!cancelled) setSyncStatus("local"); })
      .finally(() => { if (!cancelled) setMemoryReady(true); });
    return () => { cancelled = true; };
  }, [applySnapshot]);

  useEffect(() => {
    if (!memoryReady) return;
    const snapshot: DailyPracticeSnapshot = {
      goal, activeTask, completed, bpm, duration, sets, rest, pattern, pain,
      sessionMode, secondsLeft, currentSet, sessionDone, chordPair,
      beatsPerChord, chordDuration, cleanSwitches, strumPattern, strumDuration,
      strumHits, strumExtras, reviewNote,
    };
    const timer = window.setTimeout(() => {
      const updatedAt = Date.now();
      window.localStorage.setItem(`xiantu-daily-${practiceDateRef.current}`, JSON.stringify({ state: snapshot, updatedAt }));
      if (!running || updatedAt - lastCloudSyncRef.current >= 5_000) {
        lastCloudSyncRef.current = updatedAt;
        fetch("/api/daily-state", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ date: practiceDateRef.current, state: snapshot, updatedAt }),
        }).then((response) => {
          if (response.ok) setSyncStatus("synced");
          else setSyncStatus(response.status === 401 ? "local" : "failed");
        }).catch(() => setSyncStatus("failed"));
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [activeTask, beatsPerChord, bpm, chordDuration, chordPair, cleanSwitches, completed, currentSet, duration, goal, memoryReady, pain, pattern, rest, reviewNote, running, secondsLeft, sessionDone, sessionMode, sets, strumDuration, strumExtras, strumHits, strumPattern]);

  useEffect(() => { cleanSwitchesRef.current = cleanSwitches; }, [cleanSwitches]);

  useEffect(() => {
    if (!running || activeTask !== "chord" || !chordListening) return;
    if (detectedChord !== currentChord || chordConfidence < 52) return;
    if (recognizedPhaseRef.current === currentChordPhase) return;
    recognizedPhaseRef.current = currentChordPhase;
    const timer = window.setTimeout(() => { setCleanSwitches((value) => value + 1); celebrate("和弦命中"); }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTask, celebrate, chordConfidence, chordListening, currentChord, currentChordPhase, detectedChord, running]);

  useEffect(() => {
    if (chordAiChecking) chordAiTargetRef.current = { phase: currentChordPhase, chord: currentChord };
  }, [chordAiChecking, currentChord, currentChordPhase]);

  useEffect(() => {
    const aiTarget = chordAiTargetRef.current;
    if (chordSource !== "ai" || chordConfidence < 42 || detectedChord !== aiTarget.chord || aiTarget.phase < 0) return;
    if (recognizedPhaseRef.current === aiTarget.phase) return;
    recognizedPhaseRef.current = aiTarget.phase;
    const timer = window.setTimeout(() => { setCleanSwitches((value) => value + 1); celebrate("AI 复核通过"); }, 0);
    return () => window.clearTimeout(timer);
  }, [celebrate, chordConfidence, chordSource, detectedChord]);

  useEffect(() => {
    if (!running || activeTask !== "strum" || !strumListening || strumOnsetCount <= lastOnsetCountRef.current) return;
    lastOnsetCountRef.current = strumOnsetCount;
    if (recognizedStrumPhaseRef.current === beat) return;
    recognizedStrumPhaseRef.current = beat;
    const step = selectedStrum.steps[beat % selectedStrum.steps.length];
    const timer = window.setTimeout(() => {
      if (step.direction === "rest") setStrumExtras((value) => value + 1);
      else { setStrumHits((value) => value + 1); celebrate("扫弦命中"); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTask, beat, celebrate, running, selectedStrum.steps, strumListening, strumOnsetCount]);

  const saveSession = useCallback((exerciseType: "spider" | "chord" | "rhythm", exerciseId: string, seconds: number, extra?: { score?: number }) => {
    fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        exerciseType,
        exerciseId,
        durationSeconds: seconds,
        bpm,
        painScore: pain,
        score: extra?.score,
      }),
    }).catch(() => undefined);
  }, [bpm, pain]);

  const finishStrumSession = useCallback(() => {
    if (sessionDone || strumFinishLockRef.current) return;
    strumFinishLockRef.current = true;
    setRunning(false);
    setPreparationSeconds(0);
    setSecondsLeft(0);
    stopStrumRecognition();
    setSessionDone(true);
    setCompleted((items) => items.includes("strum") ? items : [...items, "strum"]);
    celebrate(strumHits ? "扫弦本轮完成" : "本轮已记录");
    saveSession("rhythm", selectedStrum.id, strumDuration, { score: strumHits });
  }, [celebrate, saveSession, selectedStrum.id, sessionDone, stopStrumRecognition, strumDuration, strumHits]);

  useEffect(() => {
    if (!running || preparationSeconds <= 0) return;
    const timer = window.setTimeout(() => setPreparationSeconds((value) => Math.max(0, value - 1)), 1_000);
    return () => window.clearTimeout(timer);
  }, [preparationSeconds, running]);

  useEffect(() => {
    if (!running || sessionDone || isPreparing) return;
    if (activeTask === "strum") {
      const timer = window.setInterval(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1_000);
      return () => window.clearInterval(timer);
    }
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) return current - 1;

        if (activeTask === "chord") {
          setRunning(false);
          stopChordRecognition();
          setSessionDone(true);
          setCompleted((items) => items.includes("chord") ? items : [...items, "chord"]);
          saveSession("chord", selectedPair.id, chordDuration, { score: cleanSwitchesRef.current });
          return 0;
        }

        if (activeTask === "spider" && sessionMode === "练习" && currentSet === sets) {
          setRunning(false);
          setSessionDone(true);
          setCompleted((items) => items.includes("spider") ? items : [...items, "spider"]);
          celebrate("本组稳定完成");
          saveSession("spider", selectedPattern.id, duration * sets);
          return 0;
        }

        if (activeTask === "spider" && sessionMode === "练习") {
          setSessionMode("休息");
          celebrate(`第 ${currentSet} 组完成`);
          return rest;
        }

        setSessionMode("练习");
        setCurrentSet((value) => value + 1);
        return duration;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeTask, celebrate, chordDuration, currentSet, duration, finishStrumSession, isPreparing, rest, running, saveSession, selectedPair.id, selectedPattern.id, sessionDone, sessionMode, sets, stopChordRecognition, strumDuration]);

  useEffect(() => {
    if (activeTask !== "strum" || !running || isPreparing || sessionDone || secondsLeft > 0) return;
    finishStrumSession();
  }, [activeTask, finishStrumSession, isPreparing, running, secondsLeft, sessionDone]);

  const resetSession = () => {
    setRunning(false);
    stopChordRecognition();
    clearChordRecognition();
    stopStrumRecognition();
    clearStrumRecognition();
    recognizedPhaseRef.current = -1;
    chordAiTargetRef.current = { phase: -1, chord: "" };
    recognizedStrumPhaseRef.current = -1;
    lastOnsetCountRef.current = 0;
    setSessionMode("练习");
    setCurrentSet(1);
    setCleanSwitches(0);
    setStrumHits(0);
    setStrumExtras(0);
    setPreparationSeconds(0);
    strumFinishLockRef.current = false;
    resetFeedback();
    setSessionDone(false);
    setSecondsLeft(activeTask === "chord" ? chordDuration : activeTask === "strum" ? strumDuration : duration);
  };

  const selectTask = (id: ExerciseId) => {
    if (activeTask === "chord") stopChordRecognition();
    if (activeTask === "strum") stopStrumRecognition();
    setActiveTask(id);
    setRunning(false);
    setSessionDone(false);
    setSessionMode("练习");
    setCurrentSet(1);
    setCleanSwitches(0);
    setStrumHits(0);
    setStrumExtras(0);
    setPreparationSeconds(0);
    strumFinishLockRef.current = false;
    resetFeedback();
    setSecondsLeft(id === "chord" ? chordDuration : id === "strum" ? strumDuration : duration);
  };

  const changeSpiderDuration = (value: number) => {
    setDuration(value);
    if (activeTask === "spider" && !running) setSecondsLeft(value);
  };

  const changeChordDuration = (value: number) => {
    setChordDuration(value);
    if (activeTask === "chord" && !running) setSecondsLeft(value);
  };

  const changeStrumDuration = (value: number) => {
    setStrumDuration(value);
    if (activeTask === "strum" && !running) setSecondsLeft(value);
  };

  const changePain = (value: number) => {
    setPain(value);
    if (value >= 3 && activeTask !== "strum") {
      setRunning(false);
      setPreparationSeconds(0);
      stopChordRecognition();
    }
  };

  const toggleSession = async () => {
    if (running) {
      setRunning(false);
      setPreparationSeconds(0);
      if (activeTask === "chord") stopChordRecognition();
      if (activeTask === "strum") stopStrumRecognition();
      return;
    }
    if (activeTask === "chord") {
      recognizedPhaseRef.current = -1;
      chordAiTargetRef.current = { phase: -1, chord: "" };
      const microphoneReady = await startChordRecognition();
      if (!microphoneReady) return;
    }
    if (activeTask === "strum") {
      recognizedStrumPhaseRef.current = -1;
      lastOnsetCountRef.current = 0;
      strumFinishLockRef.current = false;
      const microphoneReady = await startStrumRecognition();
      if (!microphoneReady) return;
    }
    setPreparationSeconds(5);
    setRunning(true);
  };

  const markComplete = (id: ExerciseId) => {
    setCompleted((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };

  return (
    <AppShell
      eyebrow="第一年 · 第 1 阶段"
      title="今日修习"
      description="先完成今天的一小步。速度服从放松，技术最终都要回到节拍和歌曲里。"
    >
      <section className="today-overview">
        <div className="today-heading">
          <div>
            <p className="eyebrow">今日安排</p>
            <h2>{goal} 分钟日课</h2>
            <span>已完成 {totalDone} 分钟 · {completed.length} / {taskMeta.length} 项</span>
            <small className={`memory-status ${syncStatus === "failed" ? "sync-failed" : ""}`}><Cloud size={13} />{!memoryReady || syncStatus === "loading" ? "正在恢复今日进度" : syncStatus === "synced" ? "今日进度已同步" : syncStatus === "failed" ? "已保存在本机，云端同步失败" : "已保存在本机浏览器"}</small>
          </div>
          <div className="segmented-control goal-control" aria-label="选择今日练习时长">
            {[60, 90, 120].map((minutes) => (
              <button key={minutes} className={goal === minutes ? "active" : ""} onClick={() => setGoal(minutes)}>{minutes} 分钟</button>
            ))}
          </div>
        </div>
        <div className="daily-progress"><span style={{ width: `${dailyProgress}%` }} /></div>
        <div className="today-tasks">
          {taskMeta.map((task, index) => {
            const Icon = task.icon;
            const done = completed.includes(task.id);
            const active = activeTask === task.id;
            return (
              <button key={task.id} className={`${active ? "active " : ""}${done ? "done" : ""}`} onClick={() => selectTask(task.id)}>
                <span className="task-order">{done ? <Check size={16} /> : index + 1}</span>
                <Icon size={18} />
                <span className="task-copy"><strong>{task.title}</strong><small>{plan[task.id]} 分钟</small></span>
              </button>
            );
          })}
        </div>
      </section>
      <AudioCalibrationWizard />

      {(activeTask === "spider" || activeTask === "chord" || activeTask === "strum") ? (
        <section className="training-workbench">
          <aside className="training-settings">
            <div className="panel-title">
              <div><p className="eyebrow">自定义练习</p><h2>{activeTask === "spider" ? "爬格子参数" : activeTask === "chord" ? "和弦转换参数" : "扫弦训练参数"}</h2></div>
              <TimerReset size={22} />
            </div>

            <NumberStepper label="节拍" value={bpm} min={30} max={120} suffix=" BPM" disabled={running} onChange={setBpm} />
            {activeTask === "spider" ? (
              <>
                <NumberStepper label="每组时间" value={duration} min={20} max={120} step={5} suffix=" 秒" disabled={running} onChange={changeSpiderDuration} />
                <NumberStepper label="组数" value={sets} min={1} max={6} suffix=" 组" disabled={running} onChange={setSets} />
                <NumberStepper label="组间休息" value={rest} min={30} max={120} step={5} suffix=" 秒" disabled={running} onChange={setRest} />
                <label className="field-select"><span>指序</span><select disabled={running} value={pattern} onChange={(event) => setPattern(event.target.value)}>{spiderPatterns.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                <button disabled={running} className="prescription-button" onClick={() => { setRunning(false); setBpm(60); changeSpiderDuration(45); setSets(3); setRest(75); setPattern("1234"); setCurrentSet(1); setSessionMode("练习"); setSessionDone(false); }}>恢复当前建议：60 BPM · 45 秒 × 3</button>
              </>
            ) : activeTask === "chord" ? (
              <>
                <label className="field-select"><span>和弦组合</span><select disabled={running} value={chordPair} onChange={(event) => setChordPair(event.target.value)}>{chordPairs.map((pair) => <option key={pair.id} value={pair.id}>{pair.from} → {pair.to} · Lv.{pair.level}</option>)}</select></label>
                <label className="field-select"><span>每个和弦保持</span><select disabled={running} value={beatsPerChord} onChange={(event) => setBeatsPerChord(Number(event.target.value))}><option value={4}>4 拍</option><option value={2}>2 拍</option><option value={1}>1 拍</option></select></label>
                <NumberStepper label="练习时间" value={chordDuration} min={30} max={300} step={15} suffix=" 秒" disabled={running} onChange={changeChordDuration} />
                <p className="setting-tip">{selectedPair.tip}</p>
                <Link href="/songs#ai-recognition-settings" className="settings-link">配置本机 AI 复核 <ArrowRight size={15} /></Link>
              </>
            ) : (
              <>
                <label className="field-select"><span>扫弦型</span><select disabled={running} value={strumPattern} onChange={(event) => setStrumPattern(event.target.value)}>{strumPatterns.map((item) => <option key={item.id} value={item.id}>{item.label} · Lv.{item.level}</option>)}</select></label>
                <NumberStepper label="练习时间" value={strumDuration} min={30} max={300} step={15} suffix=" 秒" disabled={running} onChange={changeStrumDuration} />
                <p className="setting-tip">{selectedStrum.tip}</p>
              </>
            )}
          </aside>

          <div className="practice-console">
            <header className="console-header">
              <div>
                <p>{activeTask === "spider" ? `第 ${currentSet} / ${sets} 组 · ${sessionMode}` : activeTask === "chord" ? `${selectedPair.from} ↔ ${selectedPair.to}` : `八分音符细分 · ${selectedStrum.label}`}</p>
                <h2>{activeTask === "spider" ? selectedPattern.label : activeTask === "chord" ? "看和弦图，听拍完成转换" : "跟随方向完成扫弦"}</h2>
                <span>{bpm} BPM{activeTask === "chord" ? ` · 每 ${beatsPerChord} 拍换和弦` : activeTask === "strum" ? " · 数字为正拍，& 为反拍" : " · 每拍一个音"}</span>
              </div>
              <div className="challenge-actions">
                <button className="icon-button primary" disabled={(pain >= 3 && activeTask !== "strum") || sessionDone} onClick={toggleSession} aria-label={running ? "暂停" : activeTask === "chord" || activeTask === "strum" ? "开启麦克风并开始" : "开始"}>{running ? <Pause /> : activeTask === "chord" || activeTask === "strum" ? <Mic /> : <Play />}</button>
                <button className="icon-button" onClick={resetSession} aria-label="重置"><RotateCcw /></button>
              </div>
            </header>

            <div className={`beat-stage ${running ? "running" : ""} ${sessionMode === "休息" ? "resting" : ""} ${isPreparing ? "preparing" : ""}`}>
              <div className="beat-orbit" aria-hidden="true"><span /><span /><span /></div>
              {activeTask === "spider" ? (
                <div className="finger-sequence">
                  {selectedPattern.value.split(" ").map((finger, index) => <span key={`${finger}-${index}`} className={beat % 4 === index && running ? "active" : ""}>{finger}</span>)}
                </div>
              ) : activeTask === "chord" ? (
                <div className="chord-switch-display">
                  <ChordDiagram chord={selectedPair.from} active={!running || currentChord === selectedPair.from} />
                  <span className="switch-arrow">↔</span>
                  <ChordDiagram chord={selectedPair.to} active={running && currentChord === selectedPair.to} />
                </div>
              ) : (
                <div className="strum-pattern-stage" aria-label={selectedStrum.label}>
                  {selectedStrum.steps.map((step, index) => (
                    <span key={`${step.direction}-${index}`} className={`${running && beat % selectedStrum.steps.length === index ? "active " : ""}${step.accent ? "accent" : ""}${step.direction === "rest" ? "rest" : ""}`}>
                      <small>{index % 2 === 0 ? index / 2 + 1 : "&"}</small>
                      {step.direction === "down" ? <ArrowDown /> : step.direction === "up" ? <ArrowUp /> : <i>空</i>}
                      <b>{step.accent ? "重" : ""}</b>
                    </span>
                  ))}
                </div>
              )}
              <div className="console-timer"><span>{isPreparing ? "准备" : sessionDone ? "完成" : sessionMode}</span><strong>{isPreparing ? formatTime(preparationSeconds) : formatTime(secondsLeft)}</strong></div>
              {isPreparing && <p className="prepare-countdown">调整坐姿与右手位置，{preparationSeconds} 秒后从第 1 拍开始</p>}
              {feedback && <div className="positive-feedback" key={feedback.id} role="status"><Check size={16} /><span>{feedback.message}</span><strong>{feedback.combo} 连击</strong></div>}
              {activeTask !== "strum" && <div className="beat-dots" aria-label={`第 ${(beat % 4) + 1} 拍`}>{[0, 1, 2, 3].map((index) => <span key={index} className={running && beat % 4 === index ? "active" : ""}>{index + 1}</span>)}</div>}
              {activeTask === "chord" && (
                <div className={`mic-judgement ${detectedChord === currentChord ? "correct" : ""}`}>
                  <span className="mic-state">{chordListening ? <Mic size={16} /> : <MicOff size={16} />}{chordCalibration === "calibrating" ? "正在测底噪" : chordAiChecking ? `${chordAiProvider || "AI"} 复核中` : chordListening ? "正在听" : "麦克风未开启"}</span>
                  <span><small>目标</small><strong>{currentChord}</strong></span>
                  <span><small>听到</small><strong>{detectedChord || "--"}</strong></span>
                  <span><small>置信度/来源</small><strong>{chordConfidence || 0}% · {chordSource === "ai" ? "AI" : chordSource === "local" ? "本机" : "--"}</strong></span>
                  <span className="auto-score"><Check size={16} />正确转换 <strong>{cleanSwitches}</strong></span>
                </div>
              )}
              {activeTask === "strum" && (
                <>
                  <div className="strum-judgement">
                    <span className="mic-state">{strumListening ? <Mic size={16} /> : <MicOff size={16} />}{strumCalibration === "calibrating" ? "正在测底噪" : strumListening ? "正在听扫弦" : "麦克风未开启"}</span>
                    <span><small>输入信号</small><strong>{strumSignal}%</strong></span>
                    <span><small>拍点命中</small><strong>{strumHits}</strong></span>
                    <span className={strumExtras ? "warn" : ""}><small>空拍误扫</small><strong>{strumExtras}</strong></span>
                  </div>
                  {running && !isPreparing && <button className="strum-finish-action" onClick={finishStrumSession}><CircleCheck size={16} />完成本轮并记录</button>}
                </>
              )}
              {sessionDone && <div className="completion-stamp"><CircleCheck size={24} />本项完成</div>}
            </div>
            <div className="session-progress"><span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
            {activeTask === "chord" && chordError && <p className="recognition-error">{chordError}</p>}
            {activeTask === "chord" && chordAiError && <p className="recognition-error">AI 复核未完成：{chordAiError}</p>}
            {activeTask === "chord" && chordListening && (
              <button className="ai-review-button" onClick={requestChordAiReview} disabled={chordAiChecking || chordCalibration !== "ready"}>
                <Sparkles size={15} />{chordAiChecking ? "AI 正在复核" : "将刚才的和弦交给 AI 复核"}
              </button>
            )}
            {activeTask === "strum" && strumError && <p className="recognition-error">{strumError}</p>}

            <div className={pain >= 3 ? "pain-check warning" : "pain-check compact"}>
              <div className="pain-copy">
                <span>大鱼际酸胀</span><strong>{pain} / 10</strong>
                <small>{pain < 3 ? "0-2 可继续，保持轻按；你目前一分钟会酸，优先用 45 秒短组。" : activeTask === "strum" ? "左手先放松，可改用空弦闷音继续右手扫弦。" : "已自动暂停。今天改练右手节奏、听力或歌曲结构。"}</small>
              </div>
              <div><input aria-label="大鱼际酸胀程度" type="range" min="0" max="10" value={pain} onChange={(event) => changePain(Number(event.target.value))} /><div className="pain-scale"><span>无感</span><span>注意 3</span><span>停止</span></div></div>
              {pain >= 3 ? <ShieldAlert size={24} /> : <Volume2 size={22} />}
            </div>
          </div>
        </section>
      ) : (
        <section className="simple-task-panel">
          <div className="simple-task-icon">{activeTask === "tune" ? <HeartPulse /> : activeTask === "rhythm" ? <Gauge /> : activeTask === "song" ? <Music2 /> : <ListChecks />}</div>
          <div>
            <p className="eyebrow">今日第 {taskMeta.findIndex((item) => item.id === activeTask) + 1} 项</p>
            <h2>{taskMeta.find((item) => item.id === activeTask)?.title}</h2>
            <p>{taskMeta.find((item) => item.id === activeTask)?.detail}</p>
            {activeTask === "tune" && <Link href="/tuner" className="secondary-action">打开独立调音器 <ArrowRight size={16} /></Link>}
            {activeTask === "rhythm" && <Link href="/metronome" className="secondary-action">打开独立节拍器 <ArrowRight size={16} /></Link>}
            {activeTask === "song" && <div className="next-song"><span>本周歌曲</span><strong>《{songQuests[1].title}》</strong><small>{songQuests[1].trainingBpm} BPM · {songQuests[1].focus}</small><Link href="/songs">进入分级曲库</Link></div>}
            {activeTask === "review" && <textarea className="review-note" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="今天最稳定的一处……&#10;明天只改进……" aria-label="今日练习复盘" />}
          </div>
          <button className={completed.includes(activeTask) ? "complete-task done" : "complete-task"} onClick={() => markComplete(activeTask)}>{completed.includes(activeTask) ? <><Check size={18} />已完成</> : <>完成本项 <ArrowRight size={17} /></>}</button>
        </section>
      )}

      <section className="next-milestone">
        <div><Sparkles size={20} /><span>当前里程碑</span><strong>开放和弦与稳拍 · 第 1-4 周</strong></div>
        <p>本周验收：C-G-Am-Em 循环 4 轮不断拍，并完成一首慢速中文歌。完整的两年路线已拆分为弹唱与指弹两条修习线。</p>
        <Link href="/paths">查看修习路线 <ArrowRight size={16} /></Link>
      </section>
    </AppShell>
  );
}
