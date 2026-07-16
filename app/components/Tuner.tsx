"use client";

import { CheckCircle2, Mic, MicOff, Radio, RotateCcw, Signal, Waves } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "./AppShell";

const STRINGS = [
  { label: "6弦", note: "E2", frequency: 82.41 },
  { label: "5弦", note: "A2", frequency: 110 },
  { label: "4弦", note: "D3", frequency: 146.83 },
  { label: "3弦", note: "G3", frequency: 196 },
  { label: "2弦", note: "B3", frequency: 246.94 },
  { label: "1弦", note: "E4", frequency: 329.63 },
];

type Sensitivity = "stable" | "standard" | "sensitive";
const sensitivitySettings: Record<Sensitivity, { threshold: number; samples: number; confirmations: number; interval: number; label: string }> = {
  stable: { threshold: 0.026, samples: 7, confirmations: 4, interval: 130, label: "稳定" },
  standard: { threshold: 0.017, samples: 5, confirmations: 3, interval: 100, label: "标准" },
  sensitive: { threshold: 0.009, samples: 3, confirmations: 2, interval: 70, label: "灵敏" },
};

function detectPitch(buffer: Float32Array, sampleRate: number, target: number, threshold: number) {
  let rms = 0;
  for (let index = 0; index < buffer.length; index += 1) rms += buffer[index] * buffer[index];
  rms = Math.sqrt(rms / buffer.length);
  if (rms < threshold) return { frequency: -1, rms, clarity: 0 };

  const minLag = Math.max(2, Math.floor(sampleRate / (target * 1.55)));
  const maxLag = Math.min(buffer.length / 2, Math.ceil(sampleRate / (target * 0.62)));
  let bestLag = -1;
  let bestCorrelation = 0;
  const correlations: number[] = [];

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let product = 0;
    let energyA = 0;
    let energyB = 0;
    const end = buffer.length - lag;
    for (let index = 0; index < end; index += 1) {
      const a = buffer[index];
      const b = buffer[index + lag];
      product += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    const correlation = product / Math.sqrt(Math.max(0.000001, energyA * energyB));
    correlations[lag] = correlation;
    if (correlation > bestCorrelation) { bestCorrelation = correlation; bestLag = lag; }
  }

  if (bestLag < 0 || bestCorrelation < 0.58) return { frequency: -1, rms, clarity: bestCorrelation };
  const previous = correlations[bestLag - 1] ?? bestCorrelation;
  const next = correlations[bestLag + 1] ?? bestCorrelation;
  const denominator = 2 * (2 * bestCorrelation - previous - next);
  const offset = Math.abs(denominator) > 0.00001 ? (next - previous) / denominator : 0;
  let frequency = sampleRate / (bestLag + Math.max(-0.5, Math.min(0.5, offset)));
  while (frequency > target * 1.52) frequency /= 2;
  while (frequency < target * 0.66) frequency *= 2;
  return { frequency, rms, clarity: bestCorrelation };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

export function Tuner() {
  const [listening, setListening] = useState(false);
  const [cents, setCents] = useState(0);
  const [frequency, setFrequency] = useState(0);
  const [selectedString, setSelectedString] = useState(0);
  const [sensitivity, setSensitivity] = useState<Sensitivity>("stable");
  const [signalStrength, setSignalStrength] = useState(0);
  const [lockState, setLockState] = useState<"waiting" | "confirming" | "locked">("waiting");
  const [error, setError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>([]);
  const confirmationsRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const lastGoodRef = useRef(0);

  const clearReading = useCallback(() => {
    historyRef.current = [];
    confirmationsRef.current = 0;
    setCents(0);
    setFrequency(0);
    setSignalStrength(0);
    setLockState("waiting");
  }, []);

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void contextRef.current?.close();
    frameRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
    setListening(false);
    setLockState("waiting");
  }, []);

  useEffect(() => () => stop(), [stop]);

  const selectString = (index: number) => {
    if (listening) stop();
    setSelectedString(index);
    clearReading();
  };

  const selectSensitivity = (value: Sensitivity) => {
    if (listening) stop();
    setSensitivity(value);
    clearReading();
  };

  const start = async () => {
    try {
      setError("");
      clearReading();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false },
      });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.25;
      context.createMediaStreamSource(stream).connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      streamRef.current = stream;
      contextRef.current = context;
      setListening(true);
      const target = STRINGS[selectedString].frequency;
      const settings = sensitivitySettings[sensitivity];

      const update = (timestamp: number) => {
        if (timestamp - lastUpdateRef.current >= settings.interval) {
          lastUpdateRef.current = timestamp;
          analyser.getFloatTimeDomainData(buffer);
          const result = detectPitch(buffer, context.sampleRate, target, settings.threshold);
          setSignalStrength(Math.min(100, Math.round((result.rms / 0.09) * 100)));

          if (result.frequency > 0) {
            const rawCents = 1200 * Math.log2(result.frequency / target);
            if (Math.abs(rawCents) <= 55) {
              const history = [...historyRef.current, rawCents].slice(-settings.samples);
              historyRef.current = history;
              const smoothCents = median(history);
              const spread = Math.max(...history) - Math.min(...history);
              if (history.length >= Math.min(3, settings.samples) && spread <= (sensitivity === "stable" ? 10 : 15)) confirmationsRef.current += 1;
              else confirmationsRef.current = Math.max(0, confirmationsRef.current - 1);

              setLockState(confirmationsRef.current >= settings.confirmations ? "locked" : "confirming");
              if (confirmationsRef.current >= settings.confirmations || sensitivity !== "stable") {
                setCents(Math.round(Math.max(-30, Math.min(30, smoothCents))));
                setFrequency(target * Math.pow(2, smoothCents / 1200));
                lastGoodRef.current = timestamp;
              }
            }
          } else if (timestamp - lastGoodRef.current > 1200) {
            historyRef.current = [];
            confirmationsRef.current = 0;
            setLockState("waiting");
          }
        }
        frameRef.current = requestAnimationFrame(update);
      };
      frameRef.current = requestAnimationFrame(update);
    } catch {
      setError("没有获得麦克风权限。请允许浏览器使用麦克风后再试。");
      setListening(false);
    }
  };

  const target = STRINGS[selectedString];
  const inTune = lockState === "locked" && Math.abs(cents) <= 4;
  const status = lockState === "waiting"
    ? (listening ? "信号不足，请只拨所选空弦" : "选择琴弦后开启麦克风")
    : lockState === "confirming"
      ? "正在确认音高，请让琴弦自然延音"
      : inTune ? "音准良好，读数已锁定" : cents < 0 ? "偏低，稍微拧紧" : "偏高，稍微放松";

  return (
    <AppShell
      eyebrow="独立工具 · 调音器"
      title="稳定地调准每根弦"
      description="默认使用低灵敏度稳定模式。先选择目标弦，只拨一次，等读数锁定后再小幅调整。"
    >
      <section className="tool-page tuner-page">
        <div className="tuner-stage">
          <div className={listening ? "sound-ripples listening" : "sound-ripples"} aria-hidden="true"><span /><span /><span /></div>
          <div className="target-string-label"><span>目标</span><strong>{target.label} · {target.note}</strong><small>{target.frequency.toFixed(2)} Hz</small></div>
          <div className="tuner-gauge" aria-label={`相对 ${target.note} 偏差 ${cents} cents`}>
            <div className="gauge-ticks"><span>-30</span><span>-15</span><span>0</span><span>+15</span><span>+30</span></div>
            <div className="gauge-arc" />
            <div className="tune-zone" />
            <div className="gauge-needle" style={{ transform: `rotate(${cents * 1.5}deg)` }} />
            <div className="gauge-center" />
          </div>
        </div>

        <div className="tool-controls tuner-controls">
          <div className="tuner-topline"><p className="tool-label">{listening ? "正在监听" : "麦克风未开启"}</p><span className={`lock-pill ${lockState}`}><Radio size={13} />{lockState === "locked" ? "已锁定" : lockState === "confirming" ? "确认中" : "等待信号"}</span></div>
          <div className="detected-note"><strong>{target.note}</strong><span>{frequency ? `${frequency.toFixed(2)} Hz` : `目标 ${target.frequency.toFixed(2)} Hz`}</span></div>
          <div className={inTune ? "tune-status good" : "tune-status"}><strong>{cents > 0 ? `+${cents}` : cents} cents</strong><span>{status}</span></div>

          <div className="signal-meter"><span><Signal size={15} />输入信号</span><i><b style={{ width: `${signalStrength}%` }} /></i><strong>{signalStrength}%</strong></div>

          <div className="sensitivity-control">
            <span>灵敏度</span>
            <div className="segmented-control" role="group" aria-label="调音器灵敏度">
              {(Object.keys(sensitivitySettings) as Sensitivity[]).map((value) => <button key={value} className={sensitivity === value ? "active" : ""} onClick={() => selectSensitivity(value)}>{sensitivitySettings[value].label}</button>)}
            </div>
            <small>{sensitivity === "stable" ? "推荐：过滤环境声，连续确认后才更新。" : sensitivity === "standard" ? "适合安静房间，响应和稳定性平衡。" : "适合很轻的琴声，环境噪声也更容易触发。"}</small>
          </div>

          <div className="string-selector" role="group" aria-label="选择目标琴弦">
            {STRINGS.map((string, index) => <button key={string.label} className={selectedString === index ? "active" : ""} onClick={() => selectString(index)}><span>{string.label}</span><strong>{string.note}</strong></button>)}
          </div>

          <div className="tuner-actions">
            <button className="main-mic" onClick={listening ? stop : start}>{listening ? <MicOff size={21} /> : <Mic size={21} />}{listening ? "停止监听" : "开启麦克风"}</button>
            <button className="icon-button" onClick={clearReading} aria-label="清空读数" title="清空读数"><RotateCcw /></button>
          </div>
          {error && <p className="permission-error">{error}</p>}
          <p className="tool-note">{inTune ? <CheckCircle2 size={16} /> : <Waves size={16} />}标准音 A4 = 440 Hz。每次只拨一根空弦，拨弦后让它自然延音。</p>
        </div>
      </section>
    </AppShell>
  );
}
