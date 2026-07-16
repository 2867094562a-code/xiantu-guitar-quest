"use client";

import Link from "next/link";
import {
  ArrowRight,
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
import { chordPairs, songQuests, spiderPatterns } from "../data/curriculum";
import { useMusicRecognition } from "../hooks/useMusicRecognition";
import { AppShell } from "./AppShell";

type ExerciseId = "tune" | "spider" | "chord" | "rhythm" | "song" | "review";
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
  reviewNote: string;
};

const planMinutes: Record<number, Record<ExerciseId, number>> = {
  60: { tune: 5, spider: 8, chord: 12, rhythm: 10, song: 20, review: 5 },
  90: { tune: 7, spider: 12, chord: 18, rhythm: 15, song: 30, review: 8 },
  120: { tune: 10, spider: 15, chord: 25, rhythm: 20, song: 40, review: 10 },
};

const taskMeta: Array<{ id: ExerciseId; title: string; detail: string; icon: typeof Guitar }> = [
  { id: "tune", title: "调音与放松", detail: "逐弦调准，肩、腕与拇指不夹紧", icon: HeartPulse },
  { id: "spider", title: "稳拍爬格子", detail: "短组练习，在酸胀出现前结束", icon: Hand },
  { id: "chord", title: "和弦转换", detail: "用完整拍位换和弦，不追求蛮力", icon: Dumbbell },
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

function usePracticeClick(bpm: number, enabled: boolean, accentEvery = 4) {
  const [beat, setBeat] = useState(0);
  const contextRef = useRef<AudioContext | null>(null);

  const playClick = useCallback((index: number) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!contextRef.current) contextRef.current = new AudioContextClass();
    const context = contextRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = index % accentEvery === 0 ? 1120 : 760;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.24, context.currentTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.055);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.06);
  }, [accentEvery]);

  useEffect(() => {
    if (!enabled) return;
    let current = 0;
    playClick(current);
    const timer = window.setInterval(() => {
      current += 1;
      setBeat(current);
      playClick(current);
    }, 60000 / bpm);
    return () => window.clearInterval(timer);
  }, [bpm, enabled, playClick]);

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
  const [reviewNote, setReviewNote] = useState("");
  const [memoryReady, setMemoryReady] = useState(false);
  const cleanSwitchesRef = useRef(0);
  const lastCloudSyncRef = useRef(0);
  const practiceDateRef = useRef(localDateKey());
  const recognizedPhaseRef = useRef(-1);
  const beat = usePracticeClick(bpm, running && sessionMode === "练习", 4);
  const selectedPair = chordPairs.find((pair) => pair.id === chordPair) ?? chordPairs[0];
  const selectedPattern = spiderPatterns.find((item) => item.id === pattern) ?? spiderPatterns[0];
  const chordCandidates = useMemo(() => [selectedPair.from, selectedPair.to], [selectedPair.from, selectedPair.to]);
  const {
    listening: chordListening,
    detected: detectedChord,
    confidence: chordConfidence,
    error: chordError,
    start: startChordRecognition,
    stop: stopChordRecognition,
    clear: clearChordRecognition,
  } = useMusicRecognition("chord", chordCandidates);

  const plan = planMinutes[goal];
  const totalDone = completed.reduce((sum, id) => sum + plan[id], 0);
  const dailyProgress = Math.round((totalDone / goal) * 100);
  const currentDuration = activeTask === "chord" ? chordDuration : duration;
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
      .then((data: { state?: Partial<DailyPracticeSnapshot> | null; updatedAt?: number }) => {
        if (!cancelled && data.state && (data.updatedAt ?? 0) > localUpdatedAt) applySnapshot(data.state);
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setMemoryReady(true); });
    return () => { cancelled = true; };
  }, [applySnapshot]);

  useEffect(() => {
    if (!memoryReady) return;
    const snapshot: DailyPracticeSnapshot = {
      goal, activeTask, completed, bpm, duration, sets, rest, pattern, pain,
      sessionMode, secondsLeft, currentSet, sessionDone, chordPair,
      beatsPerChord, chordDuration, cleanSwitches, reviewNote,
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
        }).catch(() => undefined);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [activeTask, beatsPerChord, bpm, chordDuration, chordPair, cleanSwitches, completed, currentSet, duration, goal, memoryReady, pain, pattern, rest, reviewNote, running, secondsLeft, sessionDone, sessionMode, sets]);

  useEffect(() => { cleanSwitchesRef.current = cleanSwitches; }, [cleanSwitches]);

  useEffect(() => {
    if (!running || activeTask !== "chord" || !chordListening) return;
    if (detectedChord !== currentChord || chordConfidence < 52) return;
    if (recognizedPhaseRef.current === currentChordPhase) return;
    recognizedPhaseRef.current = currentChordPhase;
    const timer = window.setTimeout(() => setCleanSwitches((value) => value + 1), 0);
    return () => window.clearTimeout(timer);
  }, [activeTask, chordConfidence, chordListening, currentChord, currentChordPhase, detectedChord, running]);

  const saveSession = useCallback((exerciseType: "spider" | "chord", exerciseId: string, seconds: number, extra?: { score?: number }) => {
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

  useEffect(() => {
    if (!running || sessionDone) return;
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
          saveSession("spider", selectedPattern.id, duration * sets);
          return 0;
        }

        if (activeTask === "spider" && sessionMode === "练习") {
          setSessionMode("休息");
          return rest;
        }

        setSessionMode("练习");
        setCurrentSet((value) => value + 1);
        return duration;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeTask, chordDuration, currentSet, duration, rest, running, saveSession, selectedPair.id, selectedPattern.id, sessionDone, sessionMode, sets, stopChordRecognition]);

  const resetSession = () => {
    setRunning(false);
    stopChordRecognition();
    clearChordRecognition();
    recognizedPhaseRef.current = -1;
    setSessionMode("练习");
    setCurrentSet(1);
    setCleanSwitches(0);
    setSessionDone(false);
    setSecondsLeft(activeTask === "chord" ? chordDuration : duration);
  };

  const selectTask = (id: ExerciseId) => {
    if (activeTask === "chord") stopChordRecognition();
    setActiveTask(id);
    setRunning(false);
    setSessionDone(false);
    setSessionMode("练习");
    setCurrentSet(1);
    setCleanSwitches(0);
    setSecondsLeft(id === "chord" ? chordDuration : duration);
  };

  const changeSpiderDuration = (value: number) => {
    setDuration(value);
    if (activeTask === "spider" && !running) setSecondsLeft(value);
  };

  const changeChordDuration = (value: number) => {
    setChordDuration(value);
    if (activeTask === "chord" && !running) setSecondsLeft(value);
  };

  const changePain = (value: number) => {
    setPain(value);
    if (value >= 3) {
      setRunning(false);
      stopChordRecognition();
    }
  };

  const toggleSession = async () => {
    if (running) {
      setRunning(false);
      if (activeTask === "chord") stopChordRecognition();
      return;
    }
    if (activeTask === "chord") {
      recognizedPhaseRef.current = -1;
      const microphoneReady = await startChordRecognition();
      if (!microphoneReady) return;
    }
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
            <small className="memory-status"><Cloud size={13} />{memoryReady ? "今日进度已记住" : "正在恢复今日进度"}</small>
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

      {(activeTask === "spider" || activeTask === "chord") ? (
        <section className="training-workbench">
          <aside className="training-settings">
            <div className="panel-title">
              <div><p className="eyebrow">自定义练习</p><h2>{activeTask === "spider" ? "爬格子参数" : "和弦转换参数"}</h2></div>
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
            ) : (
              <>
                <label className="field-select"><span>和弦组合</span><select disabled={running} value={chordPair} onChange={(event) => setChordPair(event.target.value)}>{chordPairs.map((pair) => <option key={pair.id} value={pair.id}>{pair.from} → {pair.to} · Lv.{pair.level}</option>)}</select></label>
                <label className="field-select"><span>每个和弦保持</span><select disabled={running} value={beatsPerChord} onChange={(event) => setBeatsPerChord(Number(event.target.value))}><option value={4}>4 拍</option><option value={2}>2 拍</option><option value={1}>1 拍</option></select></label>
                <NumberStepper label="练习时间" value={chordDuration} min={30} max={300} step={15} suffix=" 秒" disabled={running} onChange={changeChordDuration} />
                <p className="setting-tip">{selectedPair.tip}</p>
              </>
            )}
          </aside>

          <div className="practice-console">
            <header className="console-header">
              <div>
                <p>{activeTask === "spider" ? `第 ${currentSet} / ${sets} 组 · ${sessionMode}` : `${selectedPair.from} ↔ ${selectedPair.to}`}</p>
                <h2>{activeTask === "spider" ? selectedPattern.label : "听拍完成转换"}</h2>
                <span>{bpm} BPM · 每拍一次点击{activeTask === "chord" ? ` · 每 ${beatsPerChord} 拍换和弦` : " · 每拍一个音"}</span>
              </div>
              <div className="challenge-actions">
                <button className="icon-button primary" disabled={pain >= 3 || sessionDone} onClick={toggleSession} aria-label={running ? "暂停" : activeTask === "chord" ? "开启麦克风并开始" : "开始"}>{running ? <Pause /> : activeTask === "chord" ? <Mic /> : <Play />}</button>
                <button className="icon-button" onClick={resetSession} aria-label="重置"><RotateCcw /></button>
              </div>
            </header>

            <div className={`beat-stage ${running ? "running" : ""} ${sessionMode === "休息" ? "resting" : ""}`}>
              <div className="beat-orbit" aria-hidden="true"><span /><span /><span /></div>
              {activeTask === "spider" ? (
                <div className="finger-sequence">
                  {selectedPattern.value.split(" ").map((finger, index) => <span key={`${finger}-${index}`} className={beat % 4 === index && running ? "active" : ""}>{finger}</span>)}
                </div>
              ) : (
                <div className="chord-switch-display">
                  <span>现在按</span>
                  <strong>{running ? currentChord : selectedPair.from}</strong>
                  <small>下一个：{currentChord === selectedPair.from ? selectedPair.to : selectedPair.from}</small>
                </div>
              )}
              <div className="console-timer"><span>{sessionDone ? "完成" : sessionMode}</span><strong>{formatTime(secondsLeft)}</strong></div>
              <div className="beat-dots" aria-label={`第 ${(beat % 4) + 1} 拍`}>{[0, 1, 2, 3].map((index) => <span key={index} className={running && beat % 4 === index ? "active" : ""}>{index + 1}</span>)}</div>
              {activeTask === "chord" && (
                <div className={`mic-judgement ${detectedChord === currentChord ? "correct" : ""}`}>
                  <span className="mic-state">{chordListening ? <Mic size={16} /> : <MicOff size={16} />}{chordListening ? "正在听" : "麦克风未开启"}</span>
                  <span><small>目标</small><strong>{currentChord}</strong></span>
                  <span><small>听到</small><strong>{detectedChord || "--"}</strong></span>
                  <span><small>置信度</small><strong>{chordConfidence || 0}%</strong></span>
                  <span className="auto-score"><Check size={16} />正确转换 <strong>{cleanSwitches}</strong></span>
                </div>
              )}
              {sessionDone && <div className="completion-stamp"><CircleCheck size={24} />本项完成</div>}
            </div>
            <div className="session-progress"><span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
            {activeTask === "chord" && chordError && <p className="recognition-error">{chordError}</p>}

            <div className={pain >= 3 ? "pain-check warning" : "pain-check compact"}>
              <div className="pain-copy">
                <span>大鱼际酸胀</span><strong>{pain} / 10</strong>
                <small>{pain < 3 ? "0-2 可继续，保持轻按；你目前一分钟会酸，优先用 45 秒短组。" : "已自动暂停。今天改练右手节奏、听力或歌曲结构。"}</small>
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
