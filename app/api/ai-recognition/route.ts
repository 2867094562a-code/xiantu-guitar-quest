import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Provider = "gemini" | "openai" | "mimo";
type ReviewKind = "chord" | "note";
type Action = "review" | "connection" | "score";

type RecognitionRequest = {
  action?: Action;
  provider?: Provider;
  apiKey?: string;
  model?: string;
  kind?: ReviewKind;
  candidates?: string[];
  audioBase64?: string;
  imageBase64?: string;
  imageMimeType?: string;
};

type ProviderResult = { detected: string; confidence: number; reason?: string };
type ScoreResult = {
  title?: string;
  tempo?: number;
  timeSignature?: string;
  keySignature?: string;
  chords?: string[];
  rhythmSummary?: string;
  notationSummary?: string;
  capo?: number;
  capoReason?: string;
  confidence?: number;
};

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function allowRequest(ip: string) {
  const now = Date.now();
  const bucket = requestBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= 10) return false;
  bucket.count += 1;
  return true;
}

function extractJson(value: string) {
  const source = value.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
  return JSON.parse(source) as Record<string, unknown>;
}

function parseModelJson(value: string): ProviderResult {
  const parsed = extractJson(value);
  return {
    detected: typeof parsed.detected === "string" ? parsed.detected.trim() : "",
    confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0))),
    reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 120) : undefined,
  };
}

function parseScoreJson(value: string): ScoreResult {
  const parsed = extractJson(value);
  const chords = Array.isArray(parsed.chords)
    ? [...new Set(parsed.chords.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 24)
    : [];
  const capo = Math.max(0, Math.min(12, Math.round(Number(parsed.capo) || 0)));
  return {
    title: typeof parsed.title === "string" ? parsed.title.slice(0, 80) : undefined,
    tempo: Math.max(30, Math.min(240, Math.round(Number(parsed.tempo) || 0))) || undefined,
    timeSignature: typeof parsed.timeSignature === "string" ? parsed.timeSignature.slice(0, 12) : undefined,
    keySignature: typeof parsed.keySignature === "string" ? parsed.keySignature.slice(0, 24) : undefined,
    chords,
    rhythmSummary: typeof parsed.rhythmSummary === "string" ? parsed.rhythmSummary.slice(0, 120) : undefined,
    notationSummary: typeof parsed.notationSummary === "string" ? parsed.notationSummary.slice(0, 160) : undefined,
    capo,
    capoReason: typeof parsed.capoReason === "string" ? parsed.capoReason.slice(0, 120) : undefined,
    confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0))),
  };
}

function reviewPrompt(kind: ReviewKind, candidates: string[]) {
  return `Analyze this short acoustic guitar recording. Identify the clearest ${kind === "chord" ? "guitar chord" : "single guitar note"}. Choose only from this candidate list: ${candidates.join(", ")}. Do not guess from list order. If the sound is too weak, noisy, contains speech, or no candidate clearly matches, return an empty detected value. Return JSON only: {"detected":"candidate or empty","confidence":0-100,"reason":"brief reason"}.`;
}

const scorePrompt = `Read this guitar score image carefully. Return JSON only with these fields: {"title":"string or empty","tempo":number or 0,"timeSignature":"such as 4/4 or empty","keySignature":"concert key / 1= notation or empty","chords":["C","Am"],"rhythmSummary":"short Chinese description of rhythm and subdivisions","notationSummary":"short Chinese description of staff notation, melody or fingerstyle texture","capo":number 0-12,"capoReason":"short Chinese reason, empty when no capo is printed or inferable","confidence":0-100}. Read only what is visibly supported. Do not invent notes, chords, tempo, a key, or a capo. For capo, report a printed instruction first; otherwise use 0 and explain that it was not shown.`;

function providerError(data: { error?: { message?: string } }, fallback: string) {
  return data.error?.message || fallback;
}

async function callGemini(apiKey: string, model: string, parts: Array<Record<string, unknown>>) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 500 },
    }),
    cache: "no-store",
  });
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(providerError(data, `Gemini 请求失败 (${response.status})`));
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

async function callChatProvider(provider: "openai" | "mimo", apiKey: string, model: string, content: Array<Record<string, unknown>>) {
  const endpoint = provider === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.xiaomimimo.com/v1/chat/completions";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(provider === "openai" ? { authorization: `Bearer ${apiKey}` } : { "api-key": apiKey }),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      temperature: 0.1,
      max_completion_tokens: 500,
      ...(provider === "openai" ? { response_format: { type: "json_object" } } : {}),
    }),
    cache: "no-store",
  });
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(providerError(data, `${provider === "openai" ? "GPT" : "MiMo"} 请求失败 (${response.status})`));
  return data.choices?.[0]?.message?.content ?? "";
}

async function testConnection(provider: Provider, apiKey: string, model: string) {
  const prompt = "Return JSON only: {\"ok\":true}.";
  if (provider === "gemini") return callGemini(apiKey, model, [{ text: prompt }]);
  return callChatProvider(provider, apiKey, model, [{ type: "text", text: prompt }]);
}

async function reviewAudio(provider: Provider, apiKey: string, model: string, kind: ReviewKind, candidates: string[], audioBase64: string) {
  const prompt = reviewPrompt(kind, candidates);
  if (provider === "gemini") return callGemini(apiKey, model, [{ text: prompt }, { inlineData: { mimeType: "audio/wav", data: audioBase64 } }]);
  const audio = provider === "mimo" ? `data:audio/wav;base64,${audioBase64}` : audioBase64;
  return callChatProvider(provider, apiKey, model, [
    { type: "input_audio", input_audio: { data: audio, ...(provider === "openai" ? { format: "wav" } : {}) } },
    { type: "text", text: prompt },
  ]);
}

async function recognizeScore(provider: Provider, apiKey: string, model: string, imageBase64: string, mimeType: string) {
  if (provider === "gemini") return callGemini(apiKey, model, [{ text: scorePrompt }, { inlineData: { mimeType, data: imageBase64 } }]);
  return callChatProvider(provider, apiKey, model, [
    { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" } },
    { type: "text", text: scorePrompt },
  ]);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(ip)) return NextResponse.json({ error: "AI 请求过于频繁，请稍后再试。" }, { status: 429 });

  try {
    const body = await request.json() as RecognitionRequest;
    const action = body.action ?? "review";
    const provider = body.provider;
    const apiKey = body.apiKey?.trim();
    const model = body.model?.trim();
    if (!provider || !["gemini", "openai", "mimo"].includes(provider) || !apiKey || !model || apiKey.length > 512 || model.length > 100) {
      return NextResponse.json({ error: "AI 服务商、密钥或模型不完整。" }, { status: 400 });
    }

    if (action === "connection") {
      await testConnection(provider, apiKey, model);
      return NextResponse.json({ ok: true, provider, model });
    }

    if (action === "score") {
      const imageBase64 = body.imageBase64?.replace(/^data:image\/[a-z+]+;base64,/, "") ?? "";
      const imageMimeType = body.imageMimeType === "image/jpeg" || body.imageMimeType === "image/webp" ? body.imageMimeType : "image/png";
      if (!imageBase64 || imageBase64.length > 5_800_000) return NextResponse.json({ error: "导谱图片不完整或过大，请使用 4MB 内的清晰单页图片。" }, { status: 413 });
      const raw = await recognizeScore(provider, apiKey, model, imageBase64, imageMimeType);
      return NextResponse.json({ ...parseScoreJson(raw), provider });
    }

    const kind = body.kind;
    const candidates = [...new Set((body.candidates ?? []).filter((item) => typeof item === "string").map((item) => item.slice(0, 12)))].slice(0, 12);
    const audioBase64 = body.audioBase64?.replace(/^data:audio\/wav;base64,/, "") ?? "";
    if (!kind || !["chord", "note"].includes(kind) || !candidates.length || !audioBase64) {
      return NextResponse.json({ error: "AI 复核参数不完整。" }, { status: 400 });
    }
    if (audioBase64.length > 2_800_000) return NextResponse.json({ error: "AI 复核音频过大。" }, { status: 413 });
    const raw = await reviewAudio(provider, apiKey, model, kind, candidates, audioBase64);
    const result = parseModelJson(raw);
    if (result.detected && !candidates.some((candidate) => candidate.toLowerCase() === result.detected.toLowerCase())) {
      result.detected = "";
      result.confidence = 0;
    }
    return NextResponse.json({ ...result, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 请求失败";
    return NextResponse.json({ error: message.slice(0, 240) }, { status: 502 });
  }
}
