"use client";

import Link from "next/link";
import { BookOpenCheck, CalendarDays, Clock3, LogIn, LogOut, Music, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
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
};

const exerciseLabels: Record<string, string> = {
  tuning: "调音", spider: "爬格子", chord: "和弦转换", rhythm: "节奏", song: "弹唱", fingerstyle: "指弹",
};

export function ProfileDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<ProgressData>({ sessions: [], progress: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/me").then((response) => response.json()),
      fetch("/api/progress").then((response) => response.json()),
    ]).then(([me, progress]) => {
      setProfile(me as Profile);
      setHistory(progress as ProgressData);
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

  return (
    <AppShell
      eyebrow="个人修习档案"
      title="你的弦途"
      description="登录后，闯关进度、练习记录和个人导入曲谱会跟随你的账号保存。"
    >
      {!profile?.signedIn ? (
        <section className="auth-gate">
          <div className="auth-mark"><UserRound size={32} /></div>
          <h2>登录，保留每一次练习</h2>
          <p>使用 ChatGPT 账号登录后即可跨设备同步等级、连续练习天数、个人曲谱与人工校正结果。</p>
          <Link className="primary-action" href={profile?.signInHref ?? "/signin-with-chatgpt?return_to=%2Fprofile"}><LogIn size={18} />使用 ChatGPT 登录</Link>
          <small><ShieldCheck size={14} />仅保存训练所需信息，不公开你的个人曲谱。</small>
        </section>
      ) : (
        <div className="profile-layout">
          <section className="profile-summary">
            <div className="profile-identity">
              <span className="profile-avatar">{profile.user?.displayName?.slice(0, 1).toUpperCase()}</span>
              <div><h2>{profile.user?.displayName}</h2><p>{profile.user?.email}</p></div>
              <Link href={profile.signOutHref ?? "/signout-with-chatgpt?return_to=%2F"} className="icon-text-button"><LogOut size={16} />退出</Link>
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
        </div>
      )}
    </AppShell>
  );
}
