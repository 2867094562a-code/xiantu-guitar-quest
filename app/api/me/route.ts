import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "../../chatgpt-auth";
import { ensureUser } from "../../server/current-user";
import { getDb } from "../../../db";
import { users } from "../../../db/schema";

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) {
    return NextResponse.json({
      signedIn: false,
      signInHref: chatGPTSignInPath("/profile"),
    });
  }

  try {
    const user = await ensureUser(identity);
    return NextResponse.json({
      signedIn: true,
      user,
      signOutHref: chatGPTSignOutPath("/"),
    });
  } catch {
    return NextResponse.json({
      signedIn: true,
      user: {
        displayName: identity.displayName,
        email: identity.email,
        goalMinutes: 60,
        currentLevel: 1,
        streakDays: 0,
        totalXp: 0,
      },
      signOutHref: chatGPTSignOutPath("/"),
      persistenceAvailable: false,
    });
  }
}

export async function PATCH(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const body = await request.json() as { goalMinutes?: number };
  const goalMinutes = Number(body.goalMinutes);
  if (![60, 90, 120].includes(goalMinutes)) {
    return NextResponse.json({ error: "每日目标仅支持 60、90 或 120 分钟" }, { status: 400 });
  }

  const user = await ensureUser(identity);
  await getDb().update(users).set({ goalMinutes, updatedAt: new Date() }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true, goalMinutes });
}
