"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronRight, Gauge, Guitar, LibraryBig, Music2, ScanLine, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { songQuests, type LearningTrack, type SongQuest } from "../data/curriculum";
import { AppShell } from "./AppShell";

function ScoreSkeleton({ song }: { song: SongQuest }) {
  if (song.track === "singing") {
    return (
      <div className="score-skeleton">
        <div className="score-time"><strong>4</strong><strong>4</strong></div>
        {[0, 1, 2, 3].map((beat) => <span key={beat} className={beat === 0 ? "accent" : ""}><i>{beat + 1}</i><b>{song.chords?.[beat % (song.chords?.length || 1)]}</b></span>)}
      </div>
    );
  }
  return (
    <div className="fingerstyle-skeleton">
      <span><b>P</b><i>低音</i></span><em>+</em><span><b>i</b><i>3 弦</i></span><em>+</em><span><b>m</b><i>2 弦</i></span><em>+</em><span><b>a</b><i>1 弦</i></span>
    </div>
  );
}

export function SongLibrary() {
  const [track, setTrack] = useState<LearningTrack>("singing");
  const [level, setLevel] = useState(0);
  const filtered = useMemo(() => songQuests.filter((song) => song.track === track && (level === 0 || song.level === level)), [level, track]);
  const [selectedId, setSelectedId] = useState("moon");
  const selected = songQuests.find((song) => song.id === selectedId && song.track === track) ?? filtered[0] ?? songQuests.find((song) => song.track === track)!;

  const changeTrack = (value: LearningTrack) => {
    setTrack(value);
    setLevel(0);
    setSelectedId(songQuests.find((song) => song.track === value)?.id ?? "");
  };

  return (
    <AppShell
      eyebrow="中文流行歌分级曲库"
      title="曲目关卡"
      description="这里提供训练速度、和弦或指法骨架、技能重点与解锁标准。完整个人曲谱可通过智能识谱导入。"
    >
      <div className="library-toolbar">
        <div className="path-switcher compact" role="tablist" aria-label="曲目类型">
          <button role="tab" aria-selected={track === "singing"} className={track === "singing" ? "active" : ""} onClick={() => changeTrack("singing")}><Guitar size={18} /><span><strong>弹唱曲谱</strong><small>第一年</small></span></button>
          <button role="tab" aria-selected={track === "fingerstyle"} className={track === "fingerstyle" ? "active" : ""} onClick={() => changeTrack("fingerstyle")}><Music2 size={18} /><span><strong>指弹曲谱</strong><small>第二年</small></span></button>
        </div>
        <label className="level-filter"><span>难度</span><select value={level} onChange={(event) => setLevel(Number(event.target.value))}><option value={0}>全部等级</option>{[1,2,3,4,5,6,7,8].map((value) => <option key={value} value={value}>Lv. {value}</option>)}</select></label>
        <Link href="/import-score" className="primary-action"><ScanLine size={17} />导入我的曲谱</Link>
      </div>

      <div className="library-layout">
        <section className="song-list-panel" aria-label="歌曲列表">
          <header><LibraryBig size={19} /><span>{track === "singing" ? "弹唱" : "指弹"}路线</span><strong>{filtered.length} 首</strong></header>
          <div className="graded-song-list">
            {filtered.map((song) => (
              <button key={song.id} className={selected.id === song.id ? "active" : ""} onClick={() => setSelectedId(song.id)}>
                <span className="level-seal">{song.level}</span>
                <span className="song-list-copy"><strong>《{song.title}》</strong><small>{song.artist} · {song.stage}</small></span>
                <ChevronRight size={17} />
              </button>
            ))}
            {!filtered.length && <p className="empty-state">这一等级的曲目正在编排中，请先选择其他等级。</p>}
          </div>
        </section>

        <section className="song-detail-panel">
          <header className="song-detail-heading">
            <div><p className="eyebrow">Lv. {selected.level} · {selected.stage}</p><h2>《{selected.title}》</h2><span>{selected.artist}</span></div>
            <span className="track-stamp">{selected.track === "singing" ? "弹唱" : "指弹"}</span>
          </header>

          <div className="song-detail-stats">
            <div><Gauge size={18} /><span>训练速度</span><strong>{selected.trainingBpm} BPM</strong></div>
            <div><Sparkles size={18} /><span>本曲重点</span><strong>{selected.focus}</strong></div>
          </div>

          <div className="practice-score">
            <div className="panel-title"><div><p className="eyebrow">节奏/指法骨架</p><h3>{selected.track === "singing" ? "四拍循环练习谱" : "PIMA 分层练习谱"}</h3></div><BookOpen size={21} /></div>
            <ScoreSkeleton song={selected} />
            <p>{selected.pattern}</p>
          </div>

          {selected.chords && <div className="chord-bank"><span>建议和弦</span>{selected.chords.map((chord) => <strong key={chord}>{chord}</strong>)}</div>}

          <div className="unlock-rule"><Check size={19} /><div><span>解锁条件</span><strong>{selected.unlock}</strong></div></div>
          <div className="copyright-note">曲库内置的是教学用技能骨架，不包含整首歌词或完整商业曲谱。你拥有使用权的谱可导入后识别拍号、速度与谱表结构。</div>
          <div className="song-detail-actions">
            <Link href="/" className="secondary-action">加入今日训练 <ArrowRight size={16} /></Link>
            <Link href="/import-score" className="text-button"><ScanLine size={16} />导入完整个人谱</Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
