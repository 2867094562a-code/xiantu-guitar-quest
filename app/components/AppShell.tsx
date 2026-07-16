"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpenText,
  CircleUserRound,
  Gauge,
  Guitar,
  LibraryBig,
  LogIn,
  Mic2,
  Music2,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "今日", icon: Guitar },
  { href: "/paths", label: "修习", icon: BookOpenText },
  { href: "/songs", label: "曲库", icon: LibraryBig },
  { href: "/import-score", label: "识谱", icon: ScanLine },
  { href: "/metronome", label: "节拍器", icon: Gauge },
  { href: "/tuner", label: "调音器", icon: Mic2 },
];

type MeState = {
  signedIn: boolean;
  signInHref?: string;
  user?: {
    displayName: string;
    currentLevel: number;
    streakDays: number;
    totalXp: number;
  };
};

export function AppShell({
  children,
  eyebrow,
  title,
  description,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  const pathname = usePathname();
  const [me, setMe] = useState<MeState | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((response) => response.json())
      .then((data: MeState) => { if (active) setMe(data); })
      .catch(() => { if (active) setMe({ signedIn: false, signInHref: "/signin-with-chatgpt?return_to=%2Fprofile" }); });
    return () => { active = false; };
  }, []);

  const level = me?.user?.currentLevel ?? 1;
  const xp = me?.user?.totalXp ?? 0;
  const levelXp = xp % 1600;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="弦途首页">
          <span className="brand-seal"><Music2 size={20} /></span>
          <span className="brand-name">弦途</span>
          <span className="brand-subtitle">吉他修习录</span>
        </Link>

        <nav className="main-nav" aria-label="主要功能">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="player-status" aria-label="练习状态">
          {me?.signedIn ? (
            <>
              <span><Sparkles size={15} />Lv. {level}</span>
              <span className="safe"><ShieldCheck size={15} />连续 {me.user?.streakDays ?? 0} 天</span>
              <Link href="/profile" className="user-link" title="个人修习档案">
                <CircleUserRound size={18} />
                <span>{me.user?.displayName?.split("@")[0]}</span>
              </Link>
            </>
          ) : (
            <Link href={me?.signInHref ?? "/profile"} className="user-link">
              <LogIn size={17} /><span>连接云端档案</span>
            </Link>
          )}
        </div>
      </header>

      <main>
        <section className="page-intro">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="ink-progress" aria-label={`本级经验 ${levelXp} / 1600`}>
            <div className="ink-progress-copy">
              <span>第 {level} 级修习</span>
              <strong>{levelXp} / 1600</strong>
            </div>
            <div className="ink-progress-track"><span style={{ width: `${Math.max(2, levelXp / 16)}%` }} /></div>
          </div>
        </section>
        {children}
      </main>

      <footer className="site-footer">
        <span>弦途 · 两年修习计划</span>
        <span><Activity size={14} />今日目标：稳定、放松、不断拍</span>
      </footer>
    </div>
  );
}
