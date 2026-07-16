import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureUser } from "../../server/current-user";
import { getDb } from "../../../db";
import { scoreImports } from "../../../db/schema";

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ signedIn: false, scores: [] });
  const user = await ensureUser(identity);
  const scores = await getDb().select({
    id: scoreImports.id,
    title: scoreImports.title,
    fileName: scoreImports.fileName,
    track: scoreImports.track,
    tempo: scoreImports.tempo,
    timeSignature: scoreImports.timeSignature,
    keySignature: scoreImports.keySignature,
    staffCount: scoreImports.staffCount,
    measureCount: scoreImports.measureCount,
    noteCount: scoreImports.noteCount,
    confidence: scoreImports.confidence,
    status: scoreImports.status,
    createdAt: scoreImports.createdAt,
  }).from(scoreImports).where(eq(scoreImports.userId, user.id)).orderBy(desc(scoreImports.createdAt));
  return NextResponse.json({ signedIn: true, scores });
}
