export type AiProvider = "gemini" | "openai" | "mimo";

export type LocalAiSettings = {
  enabled: boolean;
  autoReview: boolean;
  provider: AiProvider;
  apiKey: string;
  model: string;
};

export const LOCAL_AI_SETTINGS_KEY = "xiantu-ai-recognition-v1";

const PROVIDER_DEFAULTS: Record<AiProvider, string> = {
  gemini: "gemini-3.5-flash",
  openai: "gpt-audio-mini",
  mimo: "mimo-v2.5",
};

export function defaultAiSettings(provider: AiProvider = "gemini"): LocalAiSettings {
  return { enabled: false, autoReview: true, provider, apiKey: "", model: PROVIDER_DEFAULTS[provider] };
}

export function modelForProvider(provider: AiProvider) {
  return PROVIDER_DEFAULTS[provider];
}

export function loadLocalAiSettings(): LocalAiSettings {
  if (typeof window === "undefined") return defaultAiSettings();
  try {
    const saved = JSON.parse(window.localStorage.getItem(LOCAL_AI_SETTINGS_KEY) ?? "{}") as Partial<LocalAiSettings>;
    const provider: AiProvider = saved.provider === "openai" || saved.provider === "mimo" ? saved.provider : "gemini";
    return {
      enabled: Boolean(saved.enabled),
      autoReview: saved.autoReview !== false,
      provider,
      apiKey: typeof saved.apiKey === "string" ? saved.apiKey : "",
      model: typeof saved.model === "string" && saved.model.trim() ? saved.model.trim() : modelForProvider(provider),
    };
  } catch {
    return defaultAiSettings();
  }
}

export function saveLocalAiSettings(settings: LocalAiSettings) {
  window.localStorage.setItem(LOCAL_AI_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("xiantu-ai-settings-changed"));
}

export function clearLocalAiSettings() {
  window.localStorage.removeItem(LOCAL_AI_SETTINGS_KEY);
  window.dispatchEvent(new CustomEvent("xiantu-ai-settings-changed"));
}
