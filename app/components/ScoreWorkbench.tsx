"use client";

import { Eye, EyeOff, Gauge, Minus, Music, Pause, Play, Plus, Repeat2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SongQuest } from "../data/curriculum";
import { ChordDiagramSet } from "./ChordDiagram";
import { StaffNotation } from "./StaffNotation";

const LADDER = [50, 60, 70, 80];

export function ScoreWorkbench({ song }: { song: SongQuest }) {
  const [bpm, setBpm] = useState(Math.min(80, Math.max(50, Number(song.trainingBpm.match(/\d+/)?.[0] ?? 60))));
  const [loopBars, setLoopBars] = useState(1);
  const [hintVisible, setHintVisible] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [misses, setMisses] = useState(0);
  const [drums, setDrums] = useState(true);
  const [bass, setBass] = useState(false);
  const [playing, setPlaying] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const next = () => { setAttempt((value) => value + 1); setMisses(0); setBpm((value) => LADDER.find((speed) => speed > value) ?? value); };
  const retry = () => { const nextMisses = misses + 1; setMisses(nextMisses); if (nextMisses >= 2) { setBpm((value) => LADDER.slice().reverse().find((speed) => speed < value) ?? value); setMisses(0); } };
  const stopBand = () => { if (timerRef.current !== null) window.clearInterval(timerRef.current); timerRef.current = null; setPlaying(false); };
  const toggleBand = () => { if (playing) { stopBand(); return; } const context = contextRef.current ?? new AudioContext(); contextRef.current = context; void context.resume(); let beat = 0; const tick = () => { const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = bass && beat % 4 === 0 ? 110 : drums ? (beat % 4 === 0 ? 960 : 620) : 440; gain.gain.setValueAtTime(.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(bass && beat % 4 === 0 ? .11 : .07, context.currentTime + .004); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .09); oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .1); beat += 1; }; tick(); timerRef.current = window.setInterval(tick, 60000 / bpm); setPlaying(true); };
  useEffect(() => () => { stopBand(); void contextRef.current?.close(); }, []);

  return <section className="score-workbench">
    <header><div><p className="eyebrow">曲谱工作台</p><h3>{loopBars} 小节循环 · 第 {attempt + 1} 轮</h3></div><div className="workbench-actions"><button className="icon-button" onClick={() => setHintVisible((value) => !value)} title={hintVisible ? "隐藏提示" : "显示提示"}>{hintVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button><button className="icon-button" onClick={() => { setBpm(50); setLoopBars(1); setMisses(0); }} title="恢复起始速度"><RotateCcw size={17} /></button></div></header>
    <div className="workbench-controls"><label>循环小节<div>{[1,2,3,4].map((value) => <button key={value} className={loopBars === value ? "active" : ""} onClick={() => setLoopBars(value)}>{value}</button>)}</div></label><label>训练速度<div><button onClick={() => setBpm((value) => Math.max(40, value - 5))}><Minus size={14} /></button><strong>{bpm} BPM</strong><button onClick={() => setBpm((value) => Math.min(160, value + 5))}><Plus size={14} /></button></div></label><span><Repeat2 size={15} />连续两轮失误会自动降一档</span></div>
    <StaffNotation song={song} />
    {hintVisible && <div className="workbench-hints"><div><strong>节奏型</strong><span>{song.pattern}</span></div><div><strong>段落结构</strong><span>主歌 · 预副歌 · 副歌</span></div><div><strong>变调 / Capo</strong><span>按你的嗓音与导入谱确认</span></div></div>}
    {song.chords && hintVisible && <ChordDiagramSet chords={song.chords} />}
    <div className="band-controls"><label><input type="checkbox" checked={drums} onChange={(event) => setDrums(event.target.checked)} /><Gauge size={15} />鼓点</label><label><input type="checkbox" checked={bass} onChange={(event) => setBass(event.target.checked)} /><Music size={15} />低音</label><button className="secondary-action" onClick={toggleBand}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? "暂停伴奏" : "开始伴奏排练"}</button></div>
    <footer><button className="secondary-action" onClick={retry}>本轮不稳定，重练当前小节</button><button className="primary-action" onClick={next}>稳定完成，进入下一速度</button></footer>
  </section>;
}
