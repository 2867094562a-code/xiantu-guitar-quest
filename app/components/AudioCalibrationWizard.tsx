"use client";

import { AudioLines, Check, LoaderCircle, Mic, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Result = { deviceId: string; deviceName: string; noise: number; sensitivity: number; updatedAt: number };
const key = "xiantu-mic-calibration-v1";

export function AudioCalibrationWizard() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [phase, setPhase] = useState<"idle" | "quiet" | "strum" | "done" | "error">("idle");
  const [message, setMessage] = useState("先选择麦克风，再完成安静环境与轻扫琴弦两步。 ");
  const [result, setResult] = useState<Result | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const samplesRef = useRef<number[]>([]);

  useEffect(() => { navigator.mediaDevices?.enumerateDevices().then((items) => { const inputs = items.filter((item) => item.kind === "audioinput"); setDevices(inputs); setDeviceId(inputs[0]?.deviceId ?? "default"); }).catch(() => undefined); }, []);
  const stop = () => { streamRef.current?.getTracks().forEach((track) => track.stop()); void contextRef.current?.close(); streamRef.current = null; contextRef.current = null; analyserRef.current = null; };
  const sample = () => { const analyser = analyserRef.current; if (!analyser) return 0; const buffer = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(buffer); return Math.sqrt(buffer.reduce((sum, value) => sum + value * value, 0) / buffer.length); };
  const start = async () => { try { stop(); const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); const context = new AudioContext(); const analyser = context.createAnalyser(); analyser.fftSize = 2048; context.createMediaStreamSource(stream).connect(analyser); streamRef.current = stream; contextRef.current = context; analyserRef.current = analyser; samplesRef.current = []; setPhase("quiet"); setMessage("请保持安静 3 秒，正在测环境底噪。 "); const quiet = window.setInterval(() => samplesRef.current.push(sample()), 100); window.setTimeout(() => { window.clearInterval(quiet); setPhase("strum"); setMessage("现在轻扫一次全部琴弦，系统会估算合适灵敏度。 "); const strum: number[] = []; const timer = window.setInterval(() => strum.push(sample()), 100); window.setTimeout(() => { window.clearInterval(timer); const noise = samplesRef.current.reduce((sum, value) => sum + value, 0) / Math.max(1, samplesRef.current.length); const peak = Math.max(...strum, 0); const saved: Result = { deviceId, deviceName: devices.find((item) => item.deviceId === deviceId)?.label || "当前麦克风", noise, sensitivity: Math.max(1, Math.min(10, Math.round((peak / Math.max(noise, .0002)) * 2))), updatedAt: Date.now() }; localStorage.setItem(`${key}:${deviceId}`, JSON.stringify(saved)); setResult(saved); setPhase("done"); setMessage(peak < noise * 2.2 ? "已听到环境声，但琴声偏小。请将音孔距麦克风约 30-60 厘米。" : noise > .025 ? "环境偏吵，已提高触发阈值；尽量避开风扇和说话声。" : "校准完成：本机识别会使用这支麦克风的专属灵敏度。 "); stop(); }, 3000); }, 3000); } catch { setPhase("error"); setMessage("无法使用麦克风。请允许浏览器权限后重试。 "); stop(); } };
  return <section className="audio-calibration"><div><p className="eyebrow">音频校准向导</p><h2>让系统先听懂你的环境</h2><span>{message}</span></div><div className="calibration-controls"><select value={deviceId} disabled={phase === "quiet" || phase === "strum"} onChange={(event) => setDeviceId(event.target.value)}>{devices.length ? devices.map((item) => <option key={item.deviceId} value={item.deviceId}>{item.label || "未命名麦克风"}</option>) : <option value="default">默认麦克风</option>}</select><button className="secondary-action" onClick={start} disabled={phase === "quiet" || phase === "strum"}>{phase === "quiet" || phase === "strum" ? <LoaderCircle className="spin" size={16} /> : <Mic size={16} />}{phase === "done" ? "重新校准" : "开始校准"}</button></div>{result && <div className="calibration-result"><span><AudioLines size={16} />底噪 {result.noise.toFixed(3)}</span><span><Volume2 size={16} />灵敏度 {result.sensitivity}/10</span><span><Check size={16} />已记住此麦克风</span></div>}</section>;
}
