import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  deviceIdentityFromSyncCode,
  getDeviceSyncCode,
  setDeviceSyncCode,
} from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { users } from "../../../db/schema";

export async function GET() {
  return NextResponse.json({ syncCode: await getDeviceSyncCode() });
}

export async function POST(request: Request) {
  const body = await request.json() as { syncCode?: string };
  const identity = await deviceIdentityFromSyncCode(body.syncCode ?? "");
  if (!identity) return NextResponse.json({ error: "同步码格式不正确" }, { status: 400 });

  const existing = await getDb().select({ id: users.id }).from(users).where(eq(users.email, identity.email)).limit(1);
  if (!existing[0]) return NextResponse.json({ error: "没有找到这个云端档案，请检查同步码" }, { status: 404 });
  await setDeviceSyncCode(body.syncCode ?? "");
  return NextResponse.json({ ok: true });
}
