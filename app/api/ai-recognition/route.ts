import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Provider = "gemini" | "openai" | "mimo";

type RecognitionRequest = {
  provider?: Provider;
  apiKey?: string;
  model?: string;
  kind?: "chord" | "note";
  candidates?: string[];
  audioBase64?: string;
};

type ProviderResult = { detected: string; confidence: number; reason?: string };

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function allowRequest(ip: string) {
  const now = Date.now();
  const bucket = requestBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= 12) return false;
  bucket.count += 1;
  return true;
}

function parseModelJson(value: string): ProviderResult {
  const source = value.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
  const parsed = JSON.parse(source) as Partial<ProviderResult>;
  return {
    detected: typeof parsed.detected === "string" ? parsed.detected.trim() : "",
    confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0))),
    reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 120) : undefined,
  };
}

function makePrompt(kind: "chord" | "note", candidates: string[]) {
  return `Analyze this short acoustic guitar recording. Identify the clearest ${kind === "chord" ? "guitar chord" : "single guitar note"}. Choose only from this candidate list: ${candidates.join(", ")}. Do not guess from list order. If the sound is too weak, noisy, contains speech, or no candidate clearly matches, return an empty detected value. Return JSON only: {"detected":"candidate or empty","confidence":0-100,"reason":"brief reason"}.`;
}

async function callGemini(apiKey: string, model: string, audioBase64: string, prompt: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "audio/wav", data: audioBase64 } }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 180 },
    }),
    cache: "no-store",
  });
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || `Gemini 请求失败 (${response.status})`);
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

async function callChatProvider(provider: "openai" | "mimo", apiKey: string, model: string, audioBase64: string, prompt: string) {
  const endpoint = provider === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.xiaomimimo.com/v1/chat/completions";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(provider === "openai" ? { authorization: `Bearer ${apiKey}` } : { "api-key": apiKey }),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: [
        { type: "input_audio", input_audio: { data: provider === "mimo" ? `data:audio/wav;base64,${audioBase64}` : audioBase64, ...(provider === "openai" ? { format: "wav" } : {}) } },
        { type: "text", text: prompt },
      ] }],
      temperature: 0.1,
      max_completion_tokens: 180,
      ...(provider === "openai" ? { response_format: { type: "json_object" } } : {}),
    }),
    cache: "no-store",
  });
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || `${provider === "openai" ? "GPT" : "MiMo"} 请求失败 (${response.status})`);
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(ip)) return NextResponse.json({ error: "AI 复核过于频繁，请稍后再试。" }, { status: 429 });

  try {
    const body = await request.json() as RecognitionRequest;
    const provider = body.provider;
    const apiKey = body.apiKey?.trim();
    const model = body.model?.trim();
    const kind = body.kind;
    const candidates = [...new Set((body.candidates ?? []).filter((item) => typeof item === "string").map((item) => item.slice(0, 12)))].slice(0, 12);
    const audioBase64 = body.audioBase64?.replace(/^data:audio\/wav;base64,/, "");
    if (!provider || !["gemini", "openai", "mimo"].includes(provider) || !apiKey || !model || !kind || !candidates.length || !audioBase64) {
      return NextResponse.json({ error: "AI 复核参数不完整。" }, { status: 400 });
    }
    if (apiKey.length > 512 || model.length > 100 || audioBase64.length > 2_800_000) {
      return NextResponse.json({ error: "AI 复核参数过大。" }, { status: 413 });
    }

    const prompt = makePrompt(kind, candidates);
    const raw = provider === "gemini"
      ? await callGemini(apiKey, model, audioBase64, prompt)
      : await callChatProvider(provider, apiKey, model, audioBase64, prompt);
    const result = parseModelJson(raw);
    if (result.detected && !candidates.some((candidate) => candidate.toLowerCase() === result.detected.toLowerCase())) {
      result.detected = "";
      result.confidence = 0;
    }
    return NextResponse.json({ ...result, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 复核失败";
    return NextResponse.json({ error: message.slice(0, 240) }, { status: 502 });
  }
}
