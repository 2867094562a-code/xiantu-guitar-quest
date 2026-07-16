"use client";

import { Mic, MicOff, RotateCcw, Waves } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "./AppShell";

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const STRINGS = [
  { label: "6弦", note: "E2", frequency: 82.41 },
  { label: "5弦", note: "A2", frequency: 110 },
  { label: "4弦", note: "D3", frequency: 146.83 },
  { label: "3弦", note: "G3", frequency: 196 },
  { label: "2弦", note: "B3", frequency: 246.94 },
  { label: "1弦", note: "E4", frequency: 329.63 },
];

function autoCorrelate(buffer: Float32Array, sampleRate: number) {
  let rms = 0;
  for (let i = 0; i < buffer.length; i += 1) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.01) return -1;

  let start = 0;
  let end = buffer.length - 1;
  const threshold = 0.2;
  for (let i = 0; i < buffer.length / 2; i += 1) {
    if (Math.abs(buffer[i]) < threshold) { start = i; break; }
  }
  for (let i = 1; i < buffer.length / 2; i += 1) {
    if (Math.abs(buffer[buffer.length - i]) < threshold) { end = buffer.length - i; break; }
  }
  const trimmed = buffer.slice(start, end);
  const correlations = new Array(trimmed.length).fill(0);
  for (let lag = 0; lag < trimmed.length; lag += 1) {
    for (let index = 0; index < trimmed.length - lag; index += 1) {
      correlations[lag] += trimmed[index] * trimmed[index + lag];
    }
  }
  let dip = 0;
  while (correlations[dip] > correlations[dip + 1]) dip += 1;
  let maxValue = -1;
  let maxIndex = -1;
  for (let index = dip; index < correlations.length; index += 1) {
    if (correlations[index] > maxValue) {
      maxValue = correlations[index];
      maxIndex = index;
    }
  }
  if (maxIndex <= 0) return -1;
  return sampleRate / maxIndex;
}

function noteFromFrequency(frequency: number) {
  const midi = Math.round(12 * Math.log2(frequency / 440) + 69);
  const target = 440 * Math.pow(2, (midi - 69) / 12);
  const cents = Math.round(1200 * Math.log2(frequency / target));
  return { name: `${NOTE_NAMES[(midi + 1200) % 12]}${Math.floor(midi / 12) - 1}`, cents };
}

export function Tuner() {
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState("--");
  const [cents, setCents] = useState(0);
  const [frequency, setFrequency] = useState(0);
  const [selectedString, setSelectedString] = useState(0);
  const [error, setError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);

  const stop = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    contextRef.current?.close();
    streamRef.current = null;
    contextRef.current = null;
    setListening(false);
  };

  useEffect(() => () => stop(), []);

  const start = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false },
      });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      context.createMediaStreamSource(stream).connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      streamRef.current = stream;
      contextRef.current = context;
      setListening(true);

      const update = () => {
        analyser.getFloatTimeDomainData(buffer);
        const detected = autoCorrelate(buffer, context.sampleRate);
        if (detected > 0) {
          const current = noteFromFrequency(detected);
          setNote(current.name);
          setCents(Math.max(-50, Math.min(50, current.cents)));
          setFrequency(detected);
        }
        frameRef.current = requestAnimationFrame(update);
      };
      update();
    } catch {
      setError("没有获得麦克风权限。请允许浏览器使用麦克风后再试。 ");
      setListening(false);
    }
  };

  const inTune = Math.abs(cents) <= 5 && note !== "--";
  const status = note === "--" ? "等待琴弦发声" : inTune ? "音准良好" : cents < 0 ? "偏低，稍微拧紧" : "偏高，稍微放松";

  return (
    <AppShell
      eyebrow="独立工具 · 调音器"
      title="先让六根弦归位"
      description="选择目标琴弦，再拨动单根空弦。环境越安静，读数越稳定。"
    >
      <section className="tool-page tuner-page">
        <div className="tuner-stage">
          <div className={listening ? "sound-ripples listening" : "sound-ripples"} aria-hidden="true">
            <span /><span /><span />
          </div>
          <div className="tuner-gauge" aria-label={`音高偏差 ${cents} cents`}>
            <div className="gauge-ticks">
              <span>-50</span><span>-20</span><span>0</span><span>+20</span><span>+50</span>
            </div>
            <div className="gauge-arc" />
            <div className="gauge-needle" style={{ transform: `rotate(${cents * 0.9}deg)` }} />
            <div className="gauge-center" />
          </div>
        </div>

        <div className="tool-controls tuner-controls">
          <p className="tool-label">{listening ? "正在监听" : "麦克风未开启"}</p>
          <div className="detected-note">
            <strong>{note}</strong>
            <span>{frequency ? `${frequency.toFixed(1)} Hz` : STRINGS[selectedString].note}</span>
          </div>
          <div className={inTune ? "tune-status good" : "tune-status"}>
            <strong>{cents > 0 ? `+${cents}` : cents} cents</strong>
            <span>{status}</span>
          </div>

          <div className="string-selector" role="group" aria-label="选择目标琴弦">
            {STRINGS.map((string, index) => (
              <button key={string.label} className={selectedString === index ? "active" : ""} onClick={() => setSelectedString(index)}>
                <span>{string.label}</span><strong>{string.note}</strong>
              </button>
            ))}
          </div>

          <div className="tuner-actions">
            <button className="main-mic" onClick={listening ? stop : start}>
              {listening ? <MicOff size={22} /> : <Mic size={22} />}
              {listening ? "停止监听" : "开启麦克风"}
            </button>
            <button className="icon-button" onClick={() => { setNote("--"); setCents(0); setFrequency(0); }} aria-label="清空读数" title="清空读数"><RotateCcw /></button>
          </div>
          {error && <p className="permission-error">{error}</p>}
          <p className="tool-note"><Waves size={16} />标准音：A4 = 440 Hz。调音时一次只拨一根空弦。</p>
        </div>
      </section>
    </AppShell>
  );
}
