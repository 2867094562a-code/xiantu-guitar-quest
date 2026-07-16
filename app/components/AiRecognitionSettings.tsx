"use client";

import { Check, Eye, EyeOff, KeyRound, LoaderCircle, Save, ShieldCheck, Sparkles, Trash2, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import {
  clearLocalAiSettings,
  defaultAiSettings,
  loadLocalAiSettings,
  modelForProvider,
  saveLocalAiSettings,
  type AiProvider,
  type LocalAiSettings,
} from "../lib/local-ai-settings";

const PROVIDERS: Array<{ id: AiProvider; label: string; detail: string }> = [
  { id: "gemini", label: "Gemini", detail: "Google 音频理解" },
  { id: "openai", label: "GPT", detail: "OpenAI 音频模型" },
  { id: "mimo", label: "MiMo", detail: "小米多模态音频" },
];

export function AiRecognitionSettings({ onRequestClose }: { onRequestClose?: () => void }) {
  const [settings, setSettings] = useState<LocalAiSettings>(() => defaultAiSettings());
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState("");
  const [connectionState, setConnectionState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSettings(loadLocalAiSettings()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectProvider = (provider: AiProvider) => {
    setSettings((current) => ({ ...current, provider, model: modelForProvider(provider) }));
    setMessage("");
  };

  const save = () => {
    const next = { ...settings, apiKey: settings.apiKey.trim(), model: settings.model.trim() || modelForProvider(settings.provider) };
    saveLocalAiSettings(next);
    setSettings(next);
    setMessage(next.enabled && next.apiKey ? "已保存在此浏览器" : "设置已保存在此浏览器；填写密钥并启用后才会调用 AI");
  };

  const clear = () => {
    clearLocalAiSettings();
    setSettings(defaultAiSettings());
    setMessage("本机 API 设置已清除");
  };

  const testConnection = async () => {
    if (!settings.apiKey.trim() || !settings.model.trim()) {
      setConnectionState("error");
      setConnectionMessage("请先填写 API Key 和模型名称。");
      return;
    }
    setConnectionState("testing");
    setConnectionMessage("正在连接服务商……");
    try {
      const response = await fetch("/api/ai-recognition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "connection", provider: settings.provider, apiKey: settings.apiKey.trim(), model: settings.model.trim() }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "连接失败");
      setConnectionState("success");
      setConnectionMessage("连接成功：模型可用于 AI 复核与智能识谱。");
    } catch (error) {
      setConnectionState("error");
      setConnectionMessage(error instanceof Error ? error.message : "连接失败，请检查密钥、模型和服务商账户。");
    }
  };

  return (
    <section id="ai-recognition-settings" className="ai-settings-panel" aria-label="AI 声音复核设置">
      <header>
        <div><p className="eyebrow">本机密钥 · 可选增强</p><h2>AI 识别中枢</h2><span>用于声音复核与自定义曲谱深度识别；本机先判断，再按需提交短音频或单页谱图。</span></div>
        <label className="setting-toggle"><input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} /><span>启用 AI 复核</span></label>
      </header>

      <div className="ai-provider-switch" role="tablist" aria-label="AI 服务商">
        {PROVIDERS.map((provider) => (
          <button key={provider.id} role="tab" aria-selected={settings.provider === provider.id} className={settings.provider === provider.id ? "active" : ""} onClick={() => selectProvider(provider.id)}>
            <strong>{provider.label}</strong><small>{provider.detail}</small>
          </button>
        ))}
      </div>

      <div className="ai-settings-form">
        <label className="ai-key-field"><span><KeyRound size={14} />API Key</span><div><input type={showKey ? "text" : "password"} autoComplete="off" value={settings.apiKey} onChange={(event) => setSettings({ ...settings, apiKey: event.target.value })} placeholder={`输入 ${PROVIDERS.find((item) => item.id === settings.provider)?.label} API Key`} /><button className="icon-button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? "隐藏 API Key" : "显示 API Key"} title={showKey ? "隐藏 API Key" : "显示 API Key"}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
        <label><span>模型</span><input value={settings.model} onChange={(event) => setSettings({ ...settings, model: event.target.value })} /></label>
        <label className="setting-toggle inline"><input type="checkbox" checked={settings.autoReview} onChange={(event) => setSettings({ ...settings, autoReview: event.target.checked })} /><span>本机连续听不清时自动复核</span></label>
      </div>

      <div className="local-key-notice"><ShieldCheck size={17} /><p><strong>密钥只写入当前浏览器的本地存储</strong><span>不会写入弦途数据库。复核时密钥与短音频会临时经过本站接口转发给所选服务商，请勿在公共设备保存。</span></p></div>
      <footer>
        <button className="primary-action" onClick={save}><Save size={16} />保存到本机</button>
        <button className="secondary-action" onClick={testConnection} disabled={connectionState === "testing"}>{connectionState === "testing" ? <LoaderCircle className="spin" size={16} /> : <Wifi size={16} />}{connectionState === "testing" ? "测试中" : "测试连接"}</button>
        <button className="icon-text-button" onClick={clear}><Trash2 size={16} />清除本机设置</button>
        {message && <span className="ai-save-message"><Check size={14} />{message}</span>}
        {connectionMessage && <span className={`ai-connection-message ${connectionState}`}><Wifi size={14} />{connectionMessage}</span>}
        <span className="ai-cost-note"><Sparkles size={14} />AI 调用可能产生服务商费用</span>
        {onRequestClose && <button className="text-button ai-close-button" onClick={onRequestClose}>完成设置</button>}
      </footer>
    </section>
  );
}
