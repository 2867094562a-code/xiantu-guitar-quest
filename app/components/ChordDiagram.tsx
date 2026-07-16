"use client";

type Finger = { string: number; fret: number; finger: number };
type Barre = { fret: number; from: number; to: number };

type ChordShape = {
  fingers: Finger[];
  open?: number[];
  muted?: number[];
  barres?: Barre[];
};

const CHORD_SHAPES: Record<string, ChordShape> = {
  C: { fingers: [{ string: 5, fret: 3, finger: 3 }, { string: 4, fret: 2, finger: 2 }, { string: 2, fret: 1, finger: 1 }], open: [3, 1], muted: [6] },
  G: { fingers: [{ string: 6, fret: 3, finger: 2 }, { string: 5, fret: 2, finger: 1 }, { string: 2, fret: 3, finger: 3 }, { string: 1, fret: 3, finger: 4 }], open: [4, 3] },
  D: { fingers: [{ string: 3, fret: 2, finger: 1 }, { string: 1, fret: 2, finger: 2 }, { string: 2, fret: 3, finger: 3 }], open: [4], muted: [6, 5] },
  Dm: { fingers: [{ string: 1, fret: 1, finger: 1 }, { string: 3, fret: 2, finger: 2 }, { string: 2, fret: 3, finger: 3 }], open: [4], muted: [6, 5] },
  E: { fingers: [{ string: 3, fret: 1, finger: 1 }, { string: 5, fret: 2, finger: 2 }, { string: 4, fret: 2, finger: 3 }], open: [6, 2, 1] },
  Em: { fingers: [{ string: 5, fret: 2, finger: 2 }, { string: 4, fret: 2, finger: 3 }], open: [6, 3, 2, 1] },
  A: { fingers: [{ string: 4, fret: 2, finger: 1 }, { string: 3, fret: 2, finger: 2 }, { string: 2, fret: 2, finger: 3 }], open: [5, 1], muted: [6] },
  Am: { fingers: [{ string: 2, fret: 1, finger: 1 }, { string: 4, fret: 2, finger: 2 }, { string: 3, fret: 2, finger: 3 }], open: [5, 1], muted: [6] },
  Fmaj7: { fingers: [{ string: 2, fret: 1, finger: 1 }, { string: 3, fret: 2, finger: 2 }, { string: 4, fret: 3, finger: 3 }], open: [1], muted: [6, 5] },
  F: { fingers: [{ string: 3, fret: 2, finger: 2 }, { string: 5, fret: 3, finger: 3 }, { string: 4, fret: 3, finger: 4 }], barres: [{ fret: 1, from: 6, to: 1 }] },
  Bm: { fingers: [{ string: 4, fret: 4, finger: 3 }, { string: 3, fret: 4, finger: 4 }, { string: 2, fret: 3, finger: 2 }], barres: [{ fret: 2, from: 5, to: 1 }], muted: [6] },
};

function normalizeChord(chord: string) {
  return chord === "小 F" ? "F" : chord.replace(/\s/g, "");
}

function stringLeft(string: number) {
  return `${((6 - string) / 5) * 100}%`;
}

function fretTop(fret: number) {
  return `${((fret - 0.5) / 5) * 100}%`;
}

export function ChordDiagram({ chord, compact = false, active = false }: { chord: string; compact?: boolean; active?: boolean }) {
  const shape = CHORD_SHAPES[normalizeChord(chord)];
  if (!shape) return <span className="chord-diagram-missing">{chord}</span>;

  return (
    <figure className={`chord-diagram${compact ? " compact" : ""}${active ? " active" : ""}`} aria-label={`${chord} 和弦图`}>
      <figcaption>{chord}</figcaption>
      <div className="chord-string-labels" aria-hidden="true">
        {[6, 5, 4, 3, 2, 1].map((string) => <span key={string}>{shape.muted?.includes(string) ? "×" : shape.open?.includes(string) ? "○" : ""}</span>)}
      </div>
      <div className="chord-fretboard" aria-hidden="true">
        {shape.barres?.map((barre) => (
          <i
            key={`${barre.fret}-${barre.from}-${barre.to}`}
            className="chord-barre"
            style={{ left: stringLeft(barre.from), right: `${((barre.to - 1) / 5) * 100}%`, top: fretTop(barre.fret) }}
          />
        ))}
        {shape.fingers.map((finger) => (
          <b key={`${finger.string}-${finger.fret}`} style={{ left: stringLeft(finger.string), top: fretTop(finger.fret) }}>{finger.finger}</b>
        ))}
      </div>
    </figure>
  );
}

export function ChordDiagramSet({ chords, compact = true }: { chords: string[]; compact?: boolean }) {
  return (
    <div className="chord-diagram-set">
      {[...new Set(chords)].map((chord) => <ChordDiagram key={chord} chord={chord} compact={compact} />)}
    </div>
  );
}
