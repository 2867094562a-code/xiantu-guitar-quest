"use client";

import Link from "next/link";
import { ArrowRight, Check, Circle, Flag, Guitar, Milestone, Music2, Sparkles } from "lucide-react";
import { useState } from "react";
import { fingerstyleStages, singingStages, type LearningTrack } from "../data/curriculum";
import { AppShell } from "./AppShell";

export function LearningPaths() {
  const [track, setTrack] = useState<LearningTrack>("singing");
  const stages = track === "singing" ? singingStages : fingerstyleStages;

  return (
    <AppShell
      eyebrow="两年专业训练路线"
      title="分轨修习"
      description="第一年建立熟练弹唱，第二年建立熟练指弹。每一阶段都有明确能力、中文曲目与验收门槛。"
    >
      <div className="path-switcher" role="tablist" aria-label="选择学习路线">
        <button role="tab" aria-selected={track === "singing"} className={track === "singing" ? "active" : ""} onClick={() => setTrack("singing")}>
          <Guitar size={22} /><span><strong>弹唱修习</strong><small>第 1-12 月 · 熟练弹唱</small></span>
        </button>
        <button role="tab" aria-selected={track === "fingerstyle"} className={track === "fingerstyle" ? "active" : ""} onClick={() => setTrack("fingerstyle")}>
          <Music2 size={22} /><span><strong>指弹修习</strong><small>第 13-24 月 · 熟练指弹</small></span>
        </button>
      </div>

      <section className="route-banner">
        <div><p className="eyebrow">{track === "singing" ? "第一年" : "第二年"}</p><h2>{track === "singing" ? "从开放和弦到完整演出" : "从 PIMA 到个人编配"}</h2></div>
        <div className="route-metrics">
          <span><strong>{track === "singing" ? "30" : "10-20"}</strong> 首目标曲库</span>
          <span><strong>{track === "singing" ? "10" : "5"}</strong> 首高完成度曲目</span>
          <span><strong>1-2</strong> 小时 / 天</span>
        </div>
      </section>

      <div className="learning-timeline">
        {stages.map((stage, index) => {
          const current = index === 0;
          return (
            <article key={stage.id} className={current ? "path-stage current" : "path-stage"}>
              <div className="timeline-marker">
                <span>{current ? <Sparkles size={18} /> : index === stages.length - 1 ? <Flag size={18} /> : <Circle size={15} />}</span>
                {index < stages.length - 1 && <i />}
              </div>
              <div className="stage-month"><span>{stage.months}</span><strong>阶段 {stage.order}</strong></div>
              <div className="stage-body">
                <header><div><h2>{stage.title}</h2><p>{stage.subtitle}</p></div>{current && <span className="current-badge">当前阶段</span>}</header>
                <div className="stage-columns">
                  <div><h3>核心能力</h3><ul>{stage.goals.map((goal) => <li key={goal}><Check size={15} />{goal}</li>)}</ul></div>
                  <div><h3>中文练习曲</h3><div className="song-chips">{stage.songs.map((song) => <span key={song}>《{song}》</span>)}</div></div>
                </div>
                <div className="checkpoint"><Milestone size={18} /><span><small>阶段验收</small><strong>{stage.checkpoint}</strong></span></div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="weekly-rhythm">
        <div><p className="eyebrow">训练节奏</p><h2>每四周一个小循环</h2></div>
        <ol>
          <li><span>1</span><strong>学习</strong><small>动作与拍位</small></li>
          <li><span>2</span><strong>稳定</strong><small>短组与慢速</small></li>
          <li><span>3</span><strong>入歌</strong><small>分段应用</small></li>
          <li><span>4</span><strong>验收</strong><small>录音与复盘</small></li>
        </ol>
        <Link href="/songs">查看对应曲库 <ArrowRight size={16} /></Link>
      </section>
    </AppShell>
  );
}
