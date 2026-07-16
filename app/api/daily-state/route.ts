import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureUser } from "../../server/current-user";
import { getDb } from "../../../db";
import { dailyPracticeStates } from "../../../db/schema";

function validDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ signedIn: false, state: null });
  const date = new URL(request.url).searchParams.get("date");
  if (!validDate(date)) return NextResponse.json({ error: "日期格式无效" }, { status: 400 });

  const user = await ensureUser(identity);
  const saved = await getDb().select().from(dailyPracticeStates).where(and(
    eq(dailyPracticeStates.userId, user.id),
    eq(dailyPracticeStates.practiceDate, date),
  )).limit(1);

  if (!saved[0]) return NextResponse.json({ signedIn: true, state: null });
  try {
    return NextResponse.json({
      signedIn: true,
      state: JSON.parse(saved[0].stateJson),
      updatedAt: saved[0].updatedAt.getTime(),
    });
  } catch {
    return NextResponse.json({ signedIn: true, state: null });
  }
}

export async function PUT(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ error: "登录后才能同步每日进度" }, { status: 401 });
  const body = await request.json() as { date?: string; state?: unknown; updatedAt?: number };
  if (!validDate(body.date ?? null) || !body.state || typeof body.state !== "object") {
    return NextResponse.json({ error: "每日进度格式无效" }, { status: 400 });
  }
  const stateJson = JSON.stringify(body.state);
  if (stateJson.length > 20_000) return NextResponse.json({ error: "每日进度数据过大" }, { status: 413 });

  const user = await ensureUser(identity);
  const db = getDb();
  const existing = await db.select({
    id: dailyPracticeStates.id,
    updatedAt: dailyPracticeStates.updatedAt,
  }).from(dailyPracticeStates).where(and(
    eq(dailyPracticeStates.userId, user.id),
    eq(dailyPracticeStates.practiceDate, body.date),
  )).limit(1);
  const updatedAt = new Date(Math.min(Date.now() + 60_000, Math.max(0, body.updatedAt ?? Date.now())));

  if (existing[0]) {
    if (existing[0].updatedAt.getTime() > updatedAt.getTime()) {
      return NextResponse.json({ ok: true, updatedAt: existing[0].updatedAt.getTime() });
    }
    await db.update(dailyPracticeStates).set({ stateJson, updatedAt }).where(eq(dailyPracticeStates.id, existing[0].id));
  } else {
    await db.insert(dailyPracticeStates).values({
      id: crypto.randomUUID(),
      userId: user.id,
      practiceDate: body.date,
      stateJson,
      updatedAt,
    });
  }
  return NextResponse.json({ ok: true, updatedAt: updatedAt.getTime() });
}
