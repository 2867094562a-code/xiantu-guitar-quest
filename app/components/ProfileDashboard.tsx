"use client";

import Link from "next/link";
import { BookOpenCheck, CalendarDays, Check, Clock3, Copy, KeyRound, LogIn, LogOut, Music, ShieldCheck, Sparkles, Target, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { songQuests } from "../data/curriculum";
import { AppShell } from "./AppShell";

type Profile = {
  signedIn: boolean;
  signInHref?: string;
  signOutHref?: string;
  persistenceAvailable?: boolean;
  user?: {
    displayName: string;
    email: string;
    goalMinutes: number;
    currentLevel: number;
    streakDays: number;
    totalXp: number;
  };
};

type ProgressData = {
  sessions: Array<{ id: string; exerciseType: string; durationSeconds: number; bpm?: number; completedAt: string }>;
  progress: Array<{ id: string; track: string; stageId: string; stars: number; status: string }>;
  weekly?: { sessionCount: number; minutes: number; highestStableBpm: number; averagePain: number; weakestChord: string; nextAction: string };
};

const exerciseLabels: Record<string, string> = {
  tuning: "调音", spider: "爬格子", chord: "和弦转换", rhythm: "节奏", song: "弹唱", fingerstyle: "指弹",
};

export function ProfileDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<ProgressData>({ sessions: [], progress: [] });
  const [saving, setSaving] = useState(false);
  const [syncCode, setSyncCode] = useState("");
  const [restoreCode, setRestoreCode] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const completedWorks = history.progress
    .filter((item) => item.status === "completed")
    .map((item) => ({ progress: item, song: songQuests.find((song) => song.id === item.stageId) }))
    .filter((item): item is { progress: ProgressData["progress"][number]; song: NonNullable<typeof item.song> } => Boolean(item.song));

  useEffect(() => {
    Promise.all([
      fetch("/api/me").then((response) => response.json()).catch(() => ({ signedIn: false, signInHref: "/profile" })),
      fetch("/api/progress").then((response) => response.json()).catch(() => ({ sessions: [], progress: [] })),
      fetch("/api/session").then((response) => response.json()).catch(() => ({ syncCode: "" })),
    ]).then(([me, progress, session]) => {
      setProfile(me as Profile);
      setHistory(progress as ProgressData);
      setSyncCode((session as { syncCode?: string }).syncCode ?? "");
    }).catch(() => setProfile({ signedIn: false, signInHref: "/signin-with-chatgpt?return_to=%2Fprofile" }));
  }, []);

  const setGoal = async (goalMinutes: number) => {
    if (!profile?.signedIn) return;
    setSaving(true);
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goalMinutes }),
    });
    if (response.ok) setProfile((current) => current?.user ? { ...current, user: { ...current.user, goalMinutes } } : current);
    setSaving(false);
  };

  const copySyncCode = async () => {
    if (!syncCode) return;
    await navigator.clipboard.writeText(syncCode);
    setSyncMessage("同步码已复制，请放在安全的位置保存。");
  };

  const restoreCloudProfile = async () => {
    setSaving(true);
    setSyncMessage("");
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ syncCode: restoreCode }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setSyncMessage(data.error ?? "恢复失败，请检查同步码。");
      setSaving(false);
      return;
    }
    setSyncMessage("云端档案已恢复，正在载入练习数据……");
    window.setTimeout(() => window.location.reload(), 500);
  };

  return (
    <AppShell
      eyebrow="个人修习档案"
      title="你的弦途"
      description="闯关进度、练习记录和个人导入曲谱会保存到 Vercel 云端；同步码可在其他设备恢复同一份档案。"
    >
      {!profile?.signedIn ? (
        <section className="auth-gate">
          <div className="auth-mark"><UserRound size={32} /></div>
          <h2>登录，保留每一次练习</h2>
          <p>连接云端档案后即可同步等级、连续练习天数、个人曲谱与人工校正结果。</p>
          <Link className="primary-action" href={profile?.signInHref ?? "/profile"}><LogIn size={18} />连接云端档案</Link>
          <small><ShieldCheck size={14} />仅保存训练所需信息，不公开你的个人曲谱。</small>
        </section>
      ) : (
        <div className="profile-layout">
          <section className="profile-summary">
            <div className="profile-identity">
              <span className="profile-avatar">{profile.user?.displayName?.slice(0, 1).toUpperCase()}</span>
              <div><h2>{profile.user?.displayName}</h2><p>{profile.user?.email.endsWith("@xiantu.local") ? "Vercel 云端档案已连接" : profile.user?.email}</p></div>
              <Link href={profile.signOutHref ?? "/api/session/reset?return_to=%2F"} className="icon-text-button"><LogOut size={16} />新建档案</Link>
            </div>
            <div className="profile-stats">
              <div><Sparkles size={19} /><span>当前等级</span><strong>Lv. {profile.user?.currentLevel}</strong></div>
              <div><CalendarDays size={19} /><span>连续练习</span><strong>{profile.user?.streakDays} 天</strong></div>
              <div><BookOpenCheck size={19} /><span>完成关卡</span><strong>{history.progress.filter((item) => item.status === "completed").length}</strong></div>
              <div><Music size={19} /><span>总经验</span><strong>{profile.user?.totalXp} XP</strong></div>
            </div>
          </section>

          <section className="profile-panel">
            <div className="panel-title"><div><p className="eyebrow">每日安排</p><h2>训练时长</h2></div><Clock3 size={22} /></div>
            <div className="segmented-control wide" aria-label="每日训练时长">
              {[60, 90, 120].map((minutes) => (
                <button key={minutes} disabled={saving} className={profile.user?.goalMinutes === minutes ? "active" : ""} onClick={() => setGoal(minutes)}>{minutes} 分钟</button>
              ))}
            </div>
            <p className="quiet-copy">今日闯关会按这个目标自动分配基础、和弦、节奏与曲目时间。</p>
          </section>

          <section className="profile-panel sync-panel">
            <div className="panel-title"><div><p className="eyebrow">跨设备恢复</p><h2>云端同步码</h2></div><KeyRound size={22} /></div>
            <div className="sync-code-row">
              <input type="password" readOnly value={syncCode} aria-label="当前云端同步码" />
              <button className="icon-text-button" disabled={!syncCode} onClick={copySyncCode}><Copy size={16} />复制</button>
            </div>
            <div className="sync-restore-row">
              <input value={restoreCode} onChange={(event) => setRestoreCode(event.target.value)} placeholder="输入另一台设备的同步码" aria-label="恢复云端档案同步码" />
              <button className="secondary-action" disabled={saving || !restoreCode.trim()} onClick={restoreCloudProfile}><Check size={16} />恢复档案</button>
            </div>
            <p className="quiet-copy">同步码等同于档案钥匙，请勿公开。恢复后，本设备会切换到对应的练习记录和曲谱。</p>
            {syncMessage && <p className="sync-message">{syncMessage}</p>}
          </section>

          <section className="profile-panel history-panel">
            <div className="panel-title"><div><p className="eyebrow">最近七次</p><h2>练习记录</h2></div></div>
            {history.sessions.length ? (
              <div className="history-list">
                {history.sessions.slice(0, 7).map((session) => (
                  <div key={session.id}>
                    <span>{exerciseLabels[session.exerciseType] ?? session.exerciseType}</span>
                    <strong>{Math.ceil(session.durationSeconds / 60)} 分钟{session.bpm ? ` · ${session.bpm} BPM` : ""}</strong>
                    <time>{new Date(session.completedAt).toLocaleDateString("zh-CN")}</time>
                  </div>
                ))}
              </div>
            ) : <p className="empty-state">完成今日第一项训练后，记录会出现在这里。</p>}
          </section>

          <section className="profile-panel weekly-report">
            <div className="panel-title"><div><p className="eyebrow">练习诊疗</p><h2>本周报告</h2></div><Target size={22} /></div>
            <div className="weekly-metrics"><span><small>练习</small><strong>{history.weekly?.minutes ?? 0} 分钟</strong></span><span><small>最高稳定</small><strong>{history.weekly?.highestStableBpm ?? 0} BPM</strong></span><span><small>平均疲劳</small><strong>{history.weekly?.averagePain ?? 0} / 10</strong></span></div>
            <p className="weekly-next"><strong>下一步：</strong>{history.weekly?.nextAction ?? "完成今天的第一项练习后，系统会给出针对性建议。"}</p>
          </section>

          <section className="profile-panel portfolio-panel">
            <div className="panel-title"><div><p className="eyebrow">已练成的曲目</p><h2>我的作品集</h2></div><Music size={22} /></div>
            {completedWorks.length ? <div className="portfolio-list">{completedWorks.slice(0, 8).map(({ progress, song }) => <div key={progress.id}><span>{song.track === "singing" ? "弹唱" : "指弹"}</span><strong>{song.title}</strong><small>{song.artist} · {"★".repeat(progress.stars)}{"☆".repeat(Math.max(0, 3 - progress.stars))}</small></div>)}</div> : <p className="empty-state">完成一轮曲目试弹后，它会留在这里，慢慢长成你的演奏曲库。</p>}
          </section>
        </div>
      )}
    </AppShell>
  );
}
