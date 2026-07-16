import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureUser } from "../../server/current-user";
import { getDb } from "../../../db";
import { courseProgress, practiceSessions } from "../../../db/schema";

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
  await db.insert(practiceSessions).values({
    id: sessionId,
    userId: user.id,
    exerciseType: body.exerciseType,
    exerciseId: body.exerciseId,
    durationSeconds: Math.max(1, Math.round(body.durationSeconds)),
    bpm: body.bpm ? Math.round(body.bpm) : null,
    score: body.score ? Math.round(body.score) : null,
    painScore: body.painScore ?? null,
    completedAt: new Date(),
  });

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
