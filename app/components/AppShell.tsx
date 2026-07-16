"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Flame,
  Gauge,
  Guitar,
  Mic2,
  Music2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "闯关训练", icon: Guitar },
  { href: "/metronome", label: "节拍器", icon: Gauge },
  { href: "/tuner", label: "调音器", icon: Mic2 },
];

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
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="player-status" aria-label="练习状态">
          <span><Sparkles size={16} />Lv. 7</span>
          <span><Flame size={16} />连续 5 天</span>
          <span className="safe"><ShieldCheck size={16} />大鱼际 1/10</span>
        </div>
      </header>

      <main>
        <section className="page-intro">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="ink-progress" aria-label="本级经验 1240 / 1600">
            <div className="ink-progress-copy">
              <span>本级修习</span>
              <strong>1240 / 1600</strong>
            </div>
            <div className="ink-progress-track"><span /></div>
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
