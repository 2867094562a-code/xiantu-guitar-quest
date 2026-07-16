"use client";

import { Minus, Pause, Play, Plus, RotateCcw, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "./AppShell";

export function Metronome() {
  const [bpm, setBpm] = useState(60);
  const [beats, setBeats] = useState(4);
  const [accent, setAccent] = useState(true);
  const [running, setRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const tapsRef = useRef<number[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  const click = useCallback((beat: number) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audioRef.current) audioRef.current = new AudioContextClass();
    const context = audioRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = accent && beat === 0 ? 1150 : 760;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, context.currentTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.055);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.06);
  }, [accent]);

  useEffect(() => {
    if (!running) return;
    let beat = 0;
    click(beat);
    setCurrentBeat(beat);
    intervalRef.current = window.setInterval(() => {
      beat = (beat + 1) % beats;
      setCurrentBeat(beat);
      click(beat);
    }, 60000 / bpm);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, bpm, beats, click]);

  const adjust = (amount: number) => setBpm((value) => Math.min(240, Math.max(30, value + amount)));

  const tapTempo = () => {
    const now = performance.now();
    const recent = [...tapsRef.current.filter((time) => now - time < 2500), now].slice(-5);
    tapsRef.current = recent;
    if (recent.length > 1) {
      const intervals = recent.slice(1).map((time, index) => time - recent[index]);
      const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
      setBpm(Math.min(240, Math.max(30, Math.round(60000 / average))));
    }
  };

  return (
    <AppShell
      eyebrow="独立工具 · 节拍器"
      title="听见时间的骨架"
      description="今天从 60 BPM 开始。先让拨弦与点击重合，再考虑加速。"
    >
      <section className="tool-page metronome-page">
        <div className="metronome-visual" aria-label={`当前第 ${currentBeat + 1} 拍`}>
          <div className={running ? "pendulum running" : "pendulum"} style={{ animationDuration: `${120 / bpm}s` }}>
            <span className="pendulum-arm" />
            <span className="pendulum-weight" />
          </div>
          <div className="beat-rings">
            {Array.from({ length: beats }).map((_, index) => (
              <span key={index} className={running && currentBeat === index ? "active" : ""}>{index + 1}</span>
            ))}
          </div>
        </div>

        <div className="tool-controls">
          <p className="tool-label">每分钟拍数</p>
          <div className="bpm-display"><strong>{bpm}</strong><span>BPM</span></div>
          <div className="bpm-buttons">
            <button className="icon-button" onClick={() => adjust(-1)} aria-label="减一 BPM" title="减一 BPM"><Minus /></button>
            <button className="main-play" onClick={() => setRunning((value) => !value)} aria-label={running ? "暂停" : "开始"}>
              {running ? <Pause size={28} /> : <Play size={28} />}
            </button>
            <button className="icon-button" onClick={() => adjust(1)} aria-label="加一 BPM" title="加一 BPM"><Plus /></button>
          </div>
          <input
            className="bpm-slider"
            aria-label="节拍速度"
            type="range"
            min="30"
            max="180"
            value={bpm}
            onChange={(event) => setBpm(Number(event.target.value))}
          />

          <div className="control-group">
            <div>
              <span>拍号</span>
              <div className="segmented-control" role="group" aria-label="拍号">
                {[2, 3, 4, 6].map((value) => (
                  <button key={value} className={beats === value ? "active" : ""} onClick={() => setBeats(value)}>{value} / {value === 6 ? 8 : 4}</button>
                ))}
              </div>
            </div>
            <label className="toggle-row">
              <span><Volume2 size={17} />重音第 1 拍</span>
              <input type="checkbox" checked={accent} onChange={(event) => setAccent(event.target.checked)} />
            </label>
          </div>

          <div className="tool-secondary-actions">
            <button onClick={tapTempo}>Tap Tempo</button>
            <button onClick={() => { setBpm(60); setCurrentBeat(0); }}><RotateCcw size={16} />回到 60</button>
          </div>
          <p className="tool-note">爬格子当前处方：60 BPM，每拍一个音，45 秒一组。</p>
        </div>
      </section>
    </AppShell>
  );
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
