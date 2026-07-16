import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../db";

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ ok: true, database: "connected" });
  } catch {
    return NextResponse.json({ ok: false, database: "unavailable" }, { status: 503 });
  }
}
