import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureUser } from "../../server/current-user";
import { getDb } from "../../../db";
import { courseProgress, practiceSessions, users } from "../../../db/schema";

function chinaDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ signedIn: false, progress: [], sessions: [] });
  const user = await ensureUser(identity);
  const db = getDb();
  const [progress, sessions] = await Promise.all([
    db.select().from(courseProgress).where(eq(courseProgress.userId, user.id)),
    db.select().from(practiceSessions).where(eq(practiceSessions.userId, user.id)).orderBy(desc(practiceSessions.completedAt)).limit(20),
  ]);
  const recent = sessions.filter((session) => session.completedAt.getTime() >= Date.now() - 7 * 86_400_000);
  const chordSessions = recent.filter((session) => session.exerciseType === "chord");
  const weakestChord = chordSessions.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
  const highestStableBpm = recent.reduce((highest, session) => Math.max(highest, session.bpm ?? 0), 0);
  const averagePain = recent.length ? Math.round(recent.reduce((sum, session) => sum + (session.painScore ?? 0), 0) / recent.length * 10) / 10 : 0;
  return NextResponse.json({ signedIn: true, progress, sessions, weekly: {
    sessionCount: recent.length,
    minutes: Math.round(recent.reduce((sum, session) => sum + session.durationSeconds, 0) / 60),
    highestStableBpm,
    averagePain,
    weakestChord: weakestChord?.exerciseId ?? "",
    nextAction: averagePain >= 3 ? "减少高负荷横按，先用 45 秒短组练右手节奏。" : weakestChord ? `优先做 ${weakestChord.exerciseId} 的 5 分钟慢速转换。` : "完成一次和弦转换挑战，建立你的第一条薄弱项记录。",
  } });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ error: "登录后可保存练习记录" }, { status: 401 });
  const user = await ensureUser(identity);
  const body = await request.json() as {
    exerciseType?: "tuning" | "spider" | "chord" | "rhythm" | "song" | "fingerstyle";
    exerciseId?: string;
    durationSeconds?: number;
    bpm?: number;
    score?: number;
    painScore?: number;
    track?: "singing" | "fingerstyle";
    stageId?: string;
    stars?: number;
  };

  if (!body.exerciseType || !body.exerciseId || !body.durationSeconds) {
    return NextResponse.json({ error: "练习记录不完整" }, { status: 400 });
  }

  const db = getDb();
  const sessionId = crypto.randomUUID();
  const previousSession = await db.select({ completedAt: practiceSessions.completedAt })
    .from(practiceSessions)
    .where(eq(practiceSessions.userId, user.id))
    .orderBy(desc(practiceSessions.completedAt))
    .limit(1);
  const completedAt = new Date();
  await db.insert(practiceSessions).values({
    id: sessionId,
    userId: user.id,
    exerciseType: body.exerciseType,
    exerciseId: body.exerciseId,
    durationSeconds: Math.max(1, Math.round(body.durationSeconds)),
    bpm: body.bpm ? Math.round(body.bpm) : null,
    score: body.score ? Math.round(body.score) : null,
    painScore: body.painScore ?? null,
    completedAt,
  });

  const today = chinaDate(completedAt);
  const yesterday = chinaDate(new Date(completedAt.getTime() - 86_400_000));
  const previousDay = previousSession[0] ? chinaDate(previousSession[0].completedAt) : undefined;
  const streakDays = previousDay === today
    ? Math.max(1, user.streakDays)
    : previousDay === yesterday ? user.streakDays + 1 : 1;
  const earnedXp = Math.max(10, Math.min(180, Math.round(body.durationSeconds / 6)));
  const totalXp = user.totalXp + earnedXp;
  await db.update(users).set({
    streakDays,
    totalXp,
    currentLevel: Math.floor(totalXp / 1600) + 1,
    updatedAt: completedAt,
  }).where(eq(users.id, user.id));

  if (body.track && body.stageId) {
    const existing = await db.select().from(courseProgress).where(and(
      eq(courseProgress.userId, user.id),
      eq(courseProgress.track, body.track),
      eq(courseProgress.stageId, body.stageId),
    )).limit(1);
    const stars = Math.max(existing[0]?.stars ?? 0, Math.min(3, body.stars ?? 1));
    if (existing[0]) {
      await db.update(courseProgress).set({
        status: "completed",
        stars,
        completedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(courseProgress.id, existing[0].id));
    } else {
      await db.insert(courseProgress).values({
        id: crypto.randomUUID(),
        userId: user.id,
        track: body.track,
        stageId: body.stageId,
        status: "completed",
        stars,
        completedAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return NextResponse.json({ ok: true, sessionId });
}
