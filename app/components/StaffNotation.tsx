"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Accidental,
  Annotation,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Voice,
} from "vexflow";
import type { SongQuest } from "../data/curriculum";

const CHORD_TONES: Record<string, string[]> = {
  C: ["c/4", "e/4", "g/4"],
  G: ["g/3", "b/3", "d/4"],
  D: ["d/4", "f#/4", "a/4"],
  Dm: ["d/4", "f/4", "a/4"],
  E: ["e/4", "g#/4", "b/4"],
  Em: ["e/4", "g/4", "b/4"],
  A: ["a/3", "c#/4", "e/4"],
  Am: ["a/3", "c/4", "e/4"],
  F: ["f/3", "a/3", "c/4"],
  Fmaj7: ["f/3", "a/3", "c/4", "e/4"],
  Bm: ["b/3", "d/4", "f#/4"],
};

function normalizeChord(chord: string) {
  return chord === "小 F" ? "F" : chord.replace(/\s/g, "");
}

function vexKey(note: string) {
  const match = note.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) return { key: "c/4", accidental: "" };
  return { key: `${match[1].toLowerCase()}${match[2]}/${match[3]}`, accidental: match[2] };
}

function addAccidentals(note: StaveNote, keys: string[]) {
  keys.forEach((key, index) => {
    const accidental = key.match(/^.[#b]/)?.[0].slice(1);
    if (accidental) note.addModifier(new Accidental(accidental), index);
  });
  return note;
}

function makeMeasure(
  context: ReturnType<Renderer["getContext"]>,
  x: number,
  width: number,
  entries: Array<{ keys: string[]; label?: string }>,
  first: boolean,
  activeIndex: number,
  offset: number,
) {
  const stave = new Stave(x, 42, width);
  if (first) stave.addClef("treble").addTimeSignature("4/4");
  stave.setContext(context).draw();
  const notes = entries.map((entry, index) => {
    const note = addAccidentals(new StaveNote({ clef: "treble", keys: entry.keys, duration: "q" }), entry.keys);
    if (entry.label) {
      note.addModifier(new Annotation(entry.label).setVerticalJustification(Annotation.VerticalJustify.TOP));
    }
    if (offset + index === activeIndex) note.setStyle({ fillStyle: "#a33a2c", strokeStyle: "#a33a2c" });
    return note;
  });
  const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables(notes);
  new Formatter().joinVoices([voice]).format([voice], width - (first ? 92 : 34));
  voice.draw(context, stave);
}

export function StaffNotation({ song, activeIndex = -1, compact = false }: { song: SongQuest; activeIndex?: number; compact?: boolean }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const entries = useMemo(() => {
    if (song.track === "singing") {
      const chords = song.chords?.length ? song.chords : ["C", "G", "Am", "Fmaj7"];
      return Array.from({ length: 8 }, (_, index) => {
        const label = chords[index % chords.length];
        return { keys: CHORD_TONES[normalizeChord(label)] ?? ["c/4", "e/4", "g/4"], label };
      });
    }
    const notes = song.trialNotes?.length ? song.trialNotes : ["E4", "G4", "B4", "E5"];
    return Array.from({ length: 8 }, (_, index) => {
      const parsed = vexKey(notes[index % notes.length]);
      return { keys: [parsed.key], label: undefined };
    });
  }, [song]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    const width = compact ? 680 : 820;
    const height = compact ? 150 : 175;
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();
    context.setFont("Arial", 10);
    const firstWidth = width / 2 - 18;
    makeMeasure(context, 10, firstWidth, entries.slice(0, 4), true, activeIndex, 0);
    makeMeasure(context, width / 2, width / 2 - 10, entries.slice(4, 8), false, activeIndex, 4);
  }, [activeIndex, compact, entries]);

  return (
    <div className="staff-notation-shell">
      <div ref={hostRef} className="staff-notation" aria-label={`${song.title} 五线谱练习片段`} />
      <div className="staff-note-labels" aria-hidden="true">
        {entries.map((entry, index) => <span key={index} className={index === activeIndex ? "active" : ""}>{song.track === "singing" ? entry.label : song.trialNotes?.[index % (song.trialNotes?.length || 1)]}</span>)}
      </div>
    </div>
  );
}
