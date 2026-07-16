"use client";

import { useEffect, useMemo, useRef } from "react";
import { Annotation, Formatter, Renderer, TabNote, TabStave, Voice } from "vexflow";
import type { SongQuest } from "../data/curriculum";

type TabPosition = { str: number; fret: string };

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

function normalizeChord(chord: string) {
  return chord === "小 F" ? "F" : chord.replace(/\s/g, "");
}

function makeMeasure(
  context: ReturnType<Renderer["getContext"]>,
  x: number,
  y: number,
  width: number,
  entries: Array<{ positions: TabPosition[]; label: string }>,
  first: boolean,
  activeIndex: number,
  offset: number,
) {
  const stave = new TabStave(x, y, width);
  if (first) stave.addClef("tab").addTimeSignature("4/4");
  stave.setContext(context).draw();
  const notes = entries.map((entry, index) => {
    const note = new TabNote({ positions: entry.positions, duration: "q" });
    note.addModifier(new Annotation(entry.label).setVerticalJustification(Annotation.VerticalJustify.TOP));
    if (offset + index === activeIndex) note.setStyle({ fillStyle: "#a33a2c", strokeStyle: "#a33a2c" });
    return note;
  });
  const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables(notes);
  new Formatter().joinVoices([voice]).format([voice], width - (first ? 88 : 30));
  voice.draw(context, stave);
}

export function StaffNotation({ song, activeIndex = -1, compact = false }: { song: SongQuest; activeIndex?: number; compact?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sections = song.track === "singing" ? ["前奏", "主歌", "副歌", "尾奏"] : ["前奏", "主题 A", "主题 B", "尾奏"];
  const entryCount = compact ? 8 : 16;
  const entries = useMemo(() => {
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

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    const width = compact ? 680 : 820;
    const height = compact ? 150 : 300;
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();
    context.setFont("Arial", 10);
    const measureWidth = width / 2 - 18;
    makeMeasure(context, 10, 42, measureWidth, entries.slice(0, 4), true, activeIndex, 0);
    makeMeasure(context, width / 2, 42, width / 2 - 10, entries.slice(4, 8), false, activeIndex, 4);
    if (!compact) {
      makeMeasure(context, 10, 164, measureWidth, entries.slice(8, 12), false, activeIndex, 8);
      makeMeasure(context, width / 2, 164, width / 2 - 10, entries.slice(12, 16), false, activeIndex, 12);
    }
  }, [activeIndex, compact, entries]);

  return (
    <div className="staff-notation-shell guitar-tab-shell">
      <div ref={hostRef} className="staff-notation guitar-tablature" aria-label={`${song.title} 吉他六线谱练习片段`} />
      {!compact && <div className="tab-section-strip" aria-label="练习编配段落"><strong>练习编配 72%</strong>{sections.map((section) => <span key={section}>{section} · 4 小节</span>)}</div>}
      {compact && <div className="staff-note-labels" aria-hidden="true">
        {entries.slice(0, 8).map((entry, index) => <span key={index} className={index === activeIndex ? "active" : ""}>{entry.label}</span>)}
      </div>}
    </div>
  );
}
