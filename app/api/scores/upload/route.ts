import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { ensureUser } from "../../../server/current-user";
import { getDb } from "../../../../db";
import { scoreImports } from "../../../../db/schema";

type ScoreAnalysis = {
  title?: string;
  track?: "singing" | "fingerstyle";
  tempo?: number | null;
  timeSignature?: string | null;
  keySignature?: string | null;
  staffCount?: number | null;
  measureCount?: number | null;
  noteCount?: number | null;
  confidence?: number;
  recognizedText?: string;
  chords?: string[];
  rhythmSummary?: string;
  notationSummary?: string;
  capo?: number;
  capoReason?: string;
};

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "score";
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ error: "登录后才能保存个人曲谱" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const rawAnalysis = form.get("analysis");
  if (!(file instanceof File) || typeof rawAnalysis !== "string") {
    return NextResponse.json({ error: "请选择曲谱文件并完成识别" }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Vercel 云端单个曲谱不能超过 4MB" }, { status: 413 });
  }
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
    return NextResponse.json({ error: "仅支持 PNG、JPG、WebP 或 PDF" }, { status: 415 });
  }

  let analysis: ScoreAnalysis;
  try {
    analysis = JSON.parse(rawAnalysis) as ScoreAnalysis;
  } catch {
    return NextResponse.json({ error: "识别结果格式有误" }, { status: 400 });
  }

  const user = await ensureUser(identity);
  const id = crypto.randomUUID();
  const objectKey = `${user.id}/${Date.now()}-${safeFileName(file.name)}`;
  const storedFile = await put(objectKey, file, {
    access: "private",
    addRandomSuffix: true,
    contentType: file.type,
  });

  const now = new Date();
  await getDb().insert(scoreImports).values({
    id,
    userId: user.id,
    title: (analysis.title || file.name.replace(/\.[^.]+$/, "")).slice(0, 120),
    fileName: file.name,
    objectKey: storedFile.url,
    contentType: file.type,
    track: analysis.track === "fingerstyle" ? "fingerstyle" : "singing",
    tempo: analysis.tempo ? Math.round(analysis.tempo) : null,
    timeSignature: analysis.timeSignature?.slice(0, 12) || null,
    keySignature: analysis.keySignature?.slice(0, 24) || null,
    staffCount: analysis.staffCount ? Math.round(analysis.staffCount) : null,
    measureCount: analysis.measureCount ? Math.round(analysis.measureCount) : null,
    noteCount: analysis.noteCount ? Math.round(analysis.noteCount) : null,
    confidence: Math.max(0, Math.min(100, Math.round(analysis.confidence ?? 0))),
    recognizedText: [
      analysis.recognizedText,
      Array.isArray(analysis.chords) && analysis.chords.length ? `和弦：${analysis.chords.join(" ")}` : "",
      analysis.rhythmSummary ? `节奏：${analysis.rhythmSummary}` : "",
      analysis.notationSummary ? `五线谱：${analysis.notationSummary}` : "",
      typeof analysis.capo === "number" ? `变调夹：${analysis.capo ? `第 ${analysis.capo} 品` : "不使用"}${analysis.capoReason ? `（${analysis.capoReason}）` : ""}` : "",
    ].filter(Boolean).join("\n").slice(0, 10000) || null,
    status: "reviewed",
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, id, title: analysis.title });
}
