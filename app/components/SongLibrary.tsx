"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronRight, Gauge, Guitar, LibraryBig, Music2, ScanLine, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { songQuests, type LearningTrack } from "../data/curriculum";
import { AppShell } from "./AppShell";
import { ChordDiagramSet } from "./ChordDiagram";
import { StaffNotation } from "./StaffNotation";
import { ScoreWorkbench } from "./ScoreWorkbench";
import { TrialPlayer } from "./TrialPlayer";

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
      eyebrow="弹唱中文流行歌 · 指弹代表曲"
      title="曲目关卡"
      description="弹唱与指弹统一使用吉他六线谱。每首都可打开麦克风试弹；本机识别不确定时，可按你的本地设置调用 AI 复核。"
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
            <div className="panel-title"><div><p className="eyebrow">吉他六线谱练习片段</p><h3>{selected.track === "singing" ? "和弦节奏练习谱" : "旋律与指法练习谱"}</h3></div><BookOpen size={21} /></div>
            <StaffNotation song={selected} />
            <p>{selected.pattern}</p>
          </div>

          <ScoreWorkbench key={`${selected.id}-workbench`} song={selected} />

          {selected.chords && (
            <section className="score-chord-section" aria-label="本曲和弦图">
              <div><span>本页和弦图</span><small>圆圈为空弦，叉号不弹，数字为左手手指</small></div>
              <ChordDiagramSet chords={selected.chords} />
            </section>
          )}

          <TrialPlayer key={selected.id} song={selected} />

          <div className="unlock-rule"><Check size={19} /><div><span>解锁条件</span><strong>{selected.unlock}</strong></div></div>
          <div className="copyright-note">本谱为至少 72% 段落覆盖的练习编配，含前奏、主歌、副歌与尾奏。弹唱曲不复制原曲旋律；现代指弹曲使用同难度原创六线谱片段。公版旋律与本人拥有使用权的导入谱可按实际把位显示。</div>
          <div className="song-detail-actions">
            <Link href="/" className="secondary-action">加入今日训练 <ArrowRight size={16} /></Link>
            <Link href="/import-score" className="text-button"><ScanLine size={16} />导入完整个人谱</Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
