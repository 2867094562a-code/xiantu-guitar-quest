"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SongQuest } from "../data/curriculum";

type TabPosition = { str: number; fret: string };
type TabEntry = { positions: TabPosition[]; label: string };

const CHORD_TABS: Record<string, TabPosition[]> = {
  C: [{ str: 5, fret: "3" }, { str: 4, fret: "2" }, { str: 3, fret: "0" }, { str: 2, fret: "1" }, { str: 1, fret: "0" }],
  G: [{ str: 6, fret: "3" }, { str: 5, fret: "2" }, { str: 4, fret: "0" }, { str: 3, fret: "0" }, { str: 2, fret: "3" }, { str: 1, fret: "3" }],
  D: [{ str: 4, fret: "0" }, { str: 3, fret: "2" }, { str: 2, fret: "3" }, { str: 1, fret: "2" }],
  Dm: [{ str: 4, fret: "0" }, { str: 3, fret: "2" }, { str: 2, fret: "3" }, { str: 1, fret: "1" }],
  E: [{ str: 6, fret: "0" }, { str: 5, fret: "2" }, { str: 4, fret: "2" }, { str: 3, fret: "1" }, { str: 2, fret: "0" }, { str: 1, fret: "0" }],
  Em: [{ str: 6, fret: "0" }, { str: 5, fret: "2" }, { str: 4, fret: "2" }, { str: 3, fret: "0" }, { str: 2, fret: "0" }, { str: 1, fret: "0" }],
  A: [{ str: 5, fret: "0" }, { str: 4, fret: "2" }, { str: 3, fret: "2" }, { str: 2, fret: "2" }, { str: 1, fret: "0" }],
  Am: [{ str: 5, fret: "0" }, { str: 4, fret: "2" }, { str: 3, fret: "2" }, { str: 2, fret: "1" }, { str: 1, fret: "0" }],
  Fmaj7: [{ str: 4, fret: "3" }, { str: 3, fret: "2" }, { str: 2, fret: "1" }, { str: 1, fret: "0" }],
  F: [{ str: 6, fret: "1" }, { str: 5, fret: "3" }, { str: 4, fret: "3" }, { str: 3, fret: "2" }, { str: 2, fret: "1" }, { str: 1, fret: "1" }],
  Bm: [{ str: 5, fret: "2" }, { str: 4, fret: "4" }, { str: 3, fret: "4" }, { str: 2, fret: "3" }, { str: 1, fret: "2" }],
};

const NOTE_TABS: Record<string, TabPosition> = {
  "A2": { str: 5, fret: "0" }, "B2": { str: 5, fret: "2" }, "D2": { str: 6, fret: "10" }, "F#2": { str: 6, fret: "2" }, "G2": { str: 6, fret: "3" },
  "D3": { str: 4, fret: "0" }, "E3": { str: 4, fret: "2" }, "G3": { str: 3, fret: "0" }, "A3": { str: 3, fret: "2" }, "B3": { str: 3, fret: "4" },
  "C4": { str: 2, fret: "1" }, "D4": { str: 2, fret: "3" }, "E4": { str: 1, fret: "0" }, "F4": { str: 1, fret: "1" }, "F#4": { str: 1, fret: "2" }, "G4": { str: 1, fret: "3" }, "A4": { str: 1, fret: "5" }, "B4": { str: 2, fret: "0" }, "C5": { str: 1, fret: "8" }, "D5": { str: 1, fret: "10" }, "E5": { str: 1, fret: "12" },
};

const STRING_FREQUENCIES: Record<number, number> = { 6: 82.41, 5: 110, 4: 146.83, 3: 196, 2: 246.94, 1: 329.63 };

function normalizeChord(chord: string) {
  return chord === "小 F" ? "F" : chord.replace(/\s/g, "");
}

function trainingTempo(value: string) {
  const tempo = Number(value.match(/\d+/)?.[0] ?? 60);
  return Math.max(40, Math.min(100, tempo));
}

function TabMeasure({ entries, section, activeIndex, offset }: { entries: TabEntry[]; section: string; activeIndex: number; offset: number }) {
  return <div className="tab-measure">
    <header><strong>{section}</strong><small>4 / 4</small></header>
    <div className="tab-grid" aria-label={`${section} 六线谱`}>
      {[1, 2, 3, 4, 5, 6].map((string) => <i key={string} className="tab-string" style={{ gridRow: string + 1 }} />)}
      {entries.map((entry, index) => <span key={`highlight-${index}`} className={offset + index === activeIndex ? "tab-active-column" : ""} style={{ gridColumn: index + 1, gridRow: "2 / 8" }} />)}
      {entries.map((entry, index) => <b key={`label-${index}`} className={offset + index === activeIndex ? "active" : ""} style={{ gridColumn: index + 1, gridRow: 1 }}>{entry.label}</b>)}
      {entries.flatMap((entry, entryIndex) => entry.positions.map((position, positionIndex) => <em key={`${entryIndex}-${position.str}-${positionIndex}`} className={offset + entryIndex === activeIndex ? "active" : ""} style={{ gridColumn: entryIndex + 1, gridRow: position.str + 1 }}>{position.fret}</em>))}
    </div>
  </div>;
}

export function StaffNotation({ song, activeIndex = -1, compact = false }: { song: SongQuest; activeIndex?: number; compact?: boolean }) {
  const audioRef = useRef<AudioContext | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const pluckTimersRef = useRef<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(-1);
  const sections = song.track === "singing" ? ["前奏", "主歌", "副歌", "尾奏"] : ["前奏", "主题 A", "主题 B", "尾奏"];
  const entryCount = compact ? 8 : 16;
  const entries = useMemo<TabEntry[]>(() => {
    if (song.track === "singing") {
      const chords = song.chords?.length ? song.chords : ["C", "G", "Am", "Fmaj7"];
      return Array.from({ length: entryCount }, (_, index) => {
        const label = chords[index % chords.length];
        return { positions: CHORD_TABS[normalizeChord(label)] ?? CHORD_TABS.C, label };
      });
    }
    const notes = song.trialNotes?.length ? song.trialNotes : ["E4", "G4", "B4", "E5"];
    return Array.from({ length: entryCount }, (_, index) => {
      const label = notes[index % notes.length];
      return { positions: [NOTE_TABS[label] ?? NOTE_TABS.E4], label };
    });
  }, [entryCount, song]);

  const stopPlayback = useCallback(() => {
    if (playbackTimerRef.current !== null) window.clearInterval(playbackTimerRef.current);
    pluckTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    playbackTimerRef.current = null;
    pluckTimersRef.current = [];
    setPlaying(false);
    setPlaybackIndex(-1);
  }, []);

  const playEntry = useCallback((entry: TabEntry) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = audioRef.current ?? new AudioContextClass();
    audioRef.current = context;
    void context.resume();
    entry.positions.forEach((position, index) => {
      const timer = window.setTimeout(() => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = STRING_FREQUENCIES[position.str] * 2 ** (Number(position.fret) / 12);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.085, context.currentTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.62);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.66);
      }, entry.positions.length > 1 ? index * 42 : 0);
      pluckTimersRef.current.push(timer);
    });
  }, []);

  const togglePlayback = useCallback(() => {
    if (playing) { stopPlayback(); return; }
    let index = 0;
    setPlaying(true);
    setPlaybackIndex(index);
    playEntry(entries[index]);
    playbackTimerRef.current = window.setInterval(() => {
      index = (index + 1) % entries.length;
      setPlaybackIndex(index);
      playEntry(entries[index]);
    }, 60_000 / trainingTempo(song.trainingBpm) * (song.track === "singing" ? 4 : 2));
  }, [entries, playEntry, playing, song.track, song.trainingBpm, stopPlayback]);

  useEffect(() => () => { stopPlayback(); void audioRef.current?.close(); }, [stopPlayback]);

  const highlightedIndex = activeIndex >= 0 ? activeIndex : playbackIndex;
  const visibleSections = compact ? ["短句 1", "短句 2"] : sections;
  const measures = Array.from({ length: compact ? 2 : 4 }, (_, index) => entries.slice(index * 4, index * 4 + 4));

  return <div className={`staff-notation-shell guitar-tab-shell${compact ? " compact" : ""}`}>
    <div className="guitar-tablature" aria-label={`${song.title} 吉他六线谱练习片段`}>
      {measures.map((measure, index) => <TabMeasure key={index} entries={measure} section={visibleSections[index]} activeIndex={highlightedIndex} offset={index * 4} />)}
    </div>
    {!compact && <div className="tab-playback-bar"><button className={`secondary-action${playing ? " playing" : ""}`} onClick={togglePlayback}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? "暂停试听" : "试听六线谱"}</button><span><Volume2 size={14} />{trainingTempo(song.trainingBpm)} BPM · {song.track === "singing" ? "每个和弦 4 拍" : "每个音 2 拍"}</span></div>}
    {!compact && <div className="tab-section-strip" aria-label="练习编配段落"><strong>练习编配 72%</strong>{sections.map((section) => <span key={section}>{section} · 4 小节</span>)}</div>}
  </div>;
}
