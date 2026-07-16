import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureUser } from "../../server/current-user";
import { getDb } from "../../../db";
import { courseProgress, practiceSessions, users } from "../../../db/schema";

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ signedIn: false, progress: [], sessions: [] });
  const user = await ensureUser(identity);
  const db = getDb();
  const [progress, sessions] = await Promise.all([
    db.select().from(courseProgress).where(eq(courseProgress.userId, user.id)),
    db.select().from(practiceSessions).where(eq(practiceSessions.userId, user.id)).orderBy(desc(practiceSessions.completedAt)).limit(20),
  ]);
  return NextResponse.json({ signedIn: true, progress, sessions });
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

  const today = completedAt.toISOString().slice(0, 10);
  const yesterday = new Date(completedAt.getTime() - 86_400_000).toISOString().slice(0, 10);
  const previousDay = previousSession[0]?.completedAt.toISOString().slice(0, 10);
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
