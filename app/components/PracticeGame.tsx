"use client";

import {
  CircleCheck,
  Clock3,
  LockKeyhole,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
  Volume2,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./AppShell";

const stages = [
  { number: 1, title: "调音入场", state: "done", stars: 3 },
  { number: 2, title: "节拍基础", state: "active", stars: 2 },
  { number: 3, title: "开放和弦", state: "ready", stars: 1 },
  { number: 4, title: "F 和弦试炼", state: "ready", stars: 0 },
  { number: 5, title: "中文弹唱", state: "locked", stars: 0 },
  { number: 6, title: "指弹进阶", state: "locked", stars: 0 },
];

const songs = [
  { name: "成都", goal: "开放和弦", progress: 100, stars: 3, state: "已通关" },
  { name: "小幸运", goal: "八分节奏", progress: 68, stars: 2, state: "修习中" },
  { name: "平凡之路", goal: "F 和弦", progress: 34, stars: 1, state: "待挑战" },
  { name: "晴天", goal: "切分节奏", progress: 0, stars: 0, state: "未解锁" },
];

function formatTime(seconds: number) {
  return `00:${seconds.toString().padStart(2, "0")}`;
}

export function PracticeGame() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(45);
  const [round, setRound] = useState(1);
  const [mode, setMode] = useState<"练习" | "休息">("练习");
  const [combo, setCombo] = useState(0);
  const [pain, setPain] = useState(1);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!running || finished) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current > 1) {
          if (mode === "练习") setCombo((value) => value + 1);
          return current - 1;
        }

        if (mode === "练习" && round === 3) {
          setRunning(false);
          setFinished(true);
          return 0;
        }

        if (mode === "练习") {
          setMode("休息");
          setCombo(0);
          return 75;
        }

        setMode("练习");
        setRound((value) => value + 1);
        return 45;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, finished, mode, round]);

  useEffect(() => {
    if (pain >= 3) setRunning(false);
  }, [pain]);

  const progress = useMemo(() => {
    const duration = mode === "练习" ? 45 : 75;
    return Math.min(100, Math.max(0, ((duration - seconds) / duration) * 100));
  }, [mode, seconds]);

  const reset = () => {
    setRunning(false);
    setSeconds(45);
    setRound(1);
    setMode("练习");
    setCombo(0);
    setFinished(false);
  };

  return (
    <AppShell
      eyebrow="第一章 · 节拍基础"
      title="今日闯关"
      description="稳住拍子，也照顾双手。今天只完成一件事：用更少的力量，把每个音放在拍上。"
    >
      <div className="practice-layout">
        <aside className="stage-map" aria-label="修习关卡">
          <div className="section-heading">
            <span>修习路径</span>
            <strong>2 / 24</strong>
          </div>
          <ol>
            {stages.map((stage) => (
              <li key={stage.number} className={`stage ${stage.state}`}>
                <div className="stage-node" aria-hidden="true">
                  {stage.state === "locked" ? <LockKeyhole size={16} /> : stage.number}
                </div>
                <div className="stage-copy">
                  <strong>{stage.title}</strong>
                  <span className="stage-stars" aria-label={`${stage.stars} 星`}>
                    {[0, 1, 2].map((star) => (
                      <Star key={star} size={13} fill={star < stage.stars ? "currentColor" : "none"} />
                    ))}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </aside>

        <section className="challenge-panel" aria-labelledby="challenge-title">
          <header className="challenge-header">
            <div>
              <p>第 8 关</p>
              <h2 id="challenge-title">稳拍爬格子</h2>
              <span>60 BPM · 45 秒 × 3 组 · 每拍一个音</span>
            </div>
            <div className="challenge-actions">
              <button
                className="icon-button primary"
                onClick={() => pain < 3 && setRunning((value) => !value)}
                aria-label={running ? "暂停练习" : "开始练习"}
                title={running ? "暂停练习" : "开始练习"}
                disabled={finished || pain >= 3}
              >
                {running ? <Pause size={21} /> : <Play size={21} />}
              </button>
              <button className="icon-button" onClick={reset} aria-label="重置本关" title="重置本关">
                <RotateCcw size={19} />
              </button>
            </div>
          </header>

          <div className="game-hud">
            <div><span>连击</span><strong>{combo}</strong></div>
            <div className="hud-timer"><span>{mode}</span><strong>{formatTime(seconds)}</strong></div>
            <div><span>组数</span><strong>{round} / 3</strong></div>
            <div><span>稳定率</span><strong>{running ? "96%" : "--"}</strong></div>
          </div>

          <div className={`fretboard-game ${running ? "is-running" : ""}`} aria-label="六弦爬格子节奏轨道">
            <div className="string-labels" aria-hidden="true">
              {["E", "B", "G", "D", "A", "E"].map((note, index) => <span key={`${note}-${index}`}>{note}</span>)}
            </div>
            <div className="fretboard-lanes">
              <span className="hit-line" />
              <span className="beat-wave wave-one" />
              <span className="beat-wave wave-two" />
              {[1, 2, 3, 4].map((finger) => (
                <span key={finger} className={`note-token note-${finger}`}>{finger}</span>
              ))}
              <div className="idle-message">
                {finished ? <><CircleCheck size={20} />本关完成，获得三枚墨印</> : running ? "听拍 · 呼吸 · 放松拇指" : "按下开始，先听一小节再进入"}
              </div>
            </div>
          </div>

          <div className="session-progress" aria-label={`本组进度 ${Math.round(progress)}%`}>
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="feedback-grid">
            <div><Clock3 size={20} /><span>节拍</span><strong>{running ? "稳定" : "待测"}</strong></div>
            <div><Volume2 size={20} /><span>声音</span><strong>{running ? "清晰" : "待测"}</strong></div>
            <div><Wind size={20} /><span>放松</span><strong>{pain < 3 ? "良好" : "暂停"}</strong></div>
          </div>

          <div className={pain >= 3 ? "pain-check warning" : "pain-check"}>
            <div className="pain-copy">
              <span>大鱼际酸胀</span>
              <strong>{pain} / 10</strong>
              <small>{pain < 3 ? "当前可继续，保持轻按" : "已暂停本动作，今天改练右手或听力"}</small>
            </div>
            <input
              aria-label="大鱼际酸胀程度"
              type="range"
              min="0"
              max="10"
              value={pain}
              onChange={(event) => setPain(Number(event.target.value))}
            />
            <div className="pain-scale" aria-hidden="true"><span>无感</span><span>注意 3</span><span>停止</span></div>
            {pain >= 3 && <ShieldAlert size={24} />}
          </div>
        </section>
      </div>

      <section className="song-quests" aria-labelledby="song-quests-title">
        <div className="section-heading">
          <div>
            <span>中文流行歌关卡</span>
            <h2 id="song-quests-title">让技术落进真正想唱的歌里</h2>
          </div>
          <button className="text-button">查看曲库 <RefreshCcw size={15} /></button>
        </div>
        <div className="song-grid">
          {songs.map((song) => (
            <article key={song.name} className={song.state === "未解锁" ? "song-card locked" : "song-card"}>
              <div className="song-number">{song.state === "未解锁" ? <LockKeyhole size={18} /> : <Sparkles size={18} />}</div>
              <div className="song-copy">
                <h3>《{song.name}》</h3>
                <p>{song.goal}</p>
                <div className="song-progress"><span style={{ width: `${song.progress}%` }} /></div>
              </div>
              <div className="song-meta">
                <span>{song.state}</span>
                <span>{song.stars} / 3 星</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
