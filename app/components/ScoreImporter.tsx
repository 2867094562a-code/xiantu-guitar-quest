"use client";

import {
  AlertTriangle,
  Check,
  FileImage,
  FileMusic,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  Save,
  ScanLine,
  Sparkles,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "./AppShell";

type Analysis = {
  title: string;
  track: "singing" | "fingerstyle";
  tempo: number;
  timeSignature: string;
  keySignature: string;
  staffCount: number;
  measureCount: number;
  noteCount: number;
  confidence: number;
  recognizedText: string;
};

type SavedScore = {
  id: string;
  title: string;
  track: "singing" | "fingerstyle";
  tempo: number | null;
  timeSignature: string | null;
  confidence: number;
  status: string;
  createdAt: string;
};

const emptyAnalysis: Analysis = {
  title: "",
  track: "singing",
  tempo: 60,
  timeSignature: "4/4",
  keySignature: "待确认",
  staffCount: 0,
  measureCount: 0,
  noteCount: 0,
  confidence: 0,
  recognizedText: "",
};

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clusterPositions(positions: number[], distance = 2) {
  const clusters: number[][] = [];
  positions.forEach((position) => {
    const last = clusters[clusters.length - 1];
    if (!last || position - last[last.length - 1] > distance) clusters.push([position]);
    else last.push(position);
  });
  return clusters.map((cluster) => Math.round(average(cluster)));
}

function inspectNotation(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1400 / image.naturalWidth);
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { staffCount: 0, measureCount: 0, noteCount: 0, structuralConfidence: 0 };
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const dark = (x: number, y: number) => {
    const index = (y * canvas.width + x) * 4;
    return (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3 < 105 && pixels[index + 3] > 100;
  };

  const horizontal: number[] = [];
  for (let y = Math.round(canvas.height * 0.08); y < canvas.height; y += 1) {
    let count = 0;
    for (let x = 0; x < canvas.width; x += 3) if (dark(x, y)) count += 1;
    if (count > canvas.width / 3 / 2.8) horizontal.push(y);
  }
  const lines = clusterPositions(horizontal, 2);
  let staffCount = 0;
  const staffBands: Array<{ top: number; bottom: number }> = [];
  for (let index = 0; index <= lines.length - 5;) {
    const group = lines.slice(index, index + 5);
    const gaps = group.slice(1).map((line, gapIndex) => line - group[gapIndex]);
    const gap = average(gaps);
    const consistent = gap >= 3 && gap <= 30 && gaps.every((value) => Math.abs(value - gap) <= Math.max(2, gap * 0.35));
    if (consistent) {
      staffCount += 1;
      staffBands.push({ top: Math.max(0, Math.round(group[0] - gap * 2)), bottom: Math.min(canvas.height - 1, Math.round(group[4] + gap * 2)) });
      index += 5;
    } else index += 1;
  }

  const verticalCandidates: number[] = [];
  for (let x = 0; x < canvas.width; x += 1) {
    let bestRatio = 0;
    staffBands.forEach((band) => {
      let count = 0;
      const height = band.bottom - band.top + 1;
      for (let y = band.top; y <= band.bottom; y += 1) if (dark(x, y)) count += 1;
      bestRatio = Math.max(bestRatio, count / height);
    });
    if (bestRatio > 0.72) verticalCandidates.push(x);
  }
  const barLines = clusterPositions(verticalCandidates, 3).filter((x) => x > canvas.width * 0.08 && x < canvas.width * 0.96);
  const measureCount = staffCount ? Math.max(0, barLines.length - staffCount) : 0;

  let noteCount = 0;
  staffBands.forEach((band) => {
    const seen = new Uint8Array(canvas.width * (band.bottom - band.top + 1));
    for (let y = band.top; y <= band.bottom; y += 2) {
      for (let x = Math.round(canvas.width * 0.08); x < canvas.width * 0.97; x += 2) {
        const localY = y - band.top;
        const seenIndex = localY * canvas.width + x;
        if (seen[seenIndex] || !dark(x, y)) continue;
        let width = 0;
        let height = 0;
        let density = 0;
        for (let dy = -5; dy <= 5; dy += 1) {
          for (let dx = -7; dx <= 7; dx += 1) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < canvas.width && py >= band.top && py <= band.bottom && dark(px, py)) {
              width = Math.max(width, Math.abs(dx));
              height = Math.max(height, Math.abs(dy));
              density += 1;
              seen[(py - band.top) * canvas.width + px] = 1;
            }
          }
        }
        if (density >= 22 && width >= 3 && height >= 2 && width <= 7 && height <= 5) noteCount += 1;
      }
    }
  });

  const structuralConfidence = Math.min(92, staffCount * 18 + Math.min(26, barLines.length * 2) + (noteCount > 0 ? 18 : 0));
  return { staffCount, measureCount, noteCount, structuralConfidence };
}

function parseText(text: string, fallbackTitle: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const title = lines.find((line) => line.length >= 2 && line.length <= 36 && !/^\d+[\s/／]\d+$/.test(line)) ?? fallbackTitle;
  const tempoMatch = text.match(/(?:BPM|Tempo|速度|♩|q)\s*[:=：]?\s*(\d{2,3})/i);
  const timeMatch = text.match(/\b([23468])\s*[\/／]\s*([248])\b/);
  const keyMatch = text.match(/(?:1|I)\s*=\s*([A-G](?:#|b|♯|♭)?)/i) ?? text.match(/\b([A-G](?:#|b)?)\s*(?:major|minor|大调|小调)\b/i);
  return {
    title,
    tempo: tempoMatch ? Math.min(240, Math.max(30, Number(tempoMatch[1]))) : 60,
    timeSignature: timeMatch ? `${timeMatch[1]}/${timeMatch[2]}` : "4/4",
    keySignature: keyMatch?.[1] ?? "待确认",
  };
}

async function fileToImage(file: File): Promise<{ image: HTMLImageElement; previewUrl: string; ocrBlob: Blob }> {
  let blob: Blob = file;
  if (file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法读取 PDF 页面");
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PDF 转图失败")), "image/png"));
  }
  const previewUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.src = previewUrl;
  await image.decode();
  return { image, previewUrl, ocrBlob: blob };
}

export function ScoreImporter() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [analysis, setAnalysis] = useState<Analysis>(emptyAnalysis);
  const [phase, setPhase] = useState<"idle" | "loading" | "recognizing" | "review" | "saving" | "saved" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [savedScores, setSavedScores] = useState<SavedScore[]>([]);
  const [signedIn, setSignedIn] = useState(false);

  const loadScores = useCallback(() => {
    fetch("/api/scores").then((response) => response.json()).then((data: { signedIn: boolean; scores: SavedScore[] }) => {
      setSignedIn(data.signedIn);
      setSavedScores(data.scores ?? []);
    }).catch(() => undefined);
  }, []);

  useEffect(() => { loadScores(); }, [loadScores]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const analyze = async (selected: File) => {
    if (selected.size > 15 * 1024 * 1024) { setPhase("error"); setMessage("文件超过 15MB，请压缩后再试。"); return; }
    setFile(selected);
    setPhase("loading");
    setProgress(8);
    setMessage("正在读取首页并增强谱面……");
    try {
      if (preview) URL.revokeObjectURL(preview);
      const rendered = await fileToImage(selected);
      setPreview(rendered.previewUrl);
      setProgress(24);
      setMessage("正在检测五线谱、谱表和小节线……");
      const structure = inspectNotation(rendered.image);
      setPhase("recognizing");
      setProgress(38);
      setMessage("正在读取曲名、速度、拍号与调号……");

      let recognizedText = "";
      let ocrConfidence = 0;
      try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("chi_sim+eng", undefined, {
          logger: (event) => {
            if (event.status === "recognizing text") setProgress(38 + Math.round((event.progress ?? 0) * 48));
          },
        });
        const result = await worker.recognize(rendered.ocrBlob);
        recognizedText = result.data.text;
        ocrConfidence = result.data.confidence;
        await worker.terminate();
      } catch {
        recognizedText = "文字识别未完成；谱面结构已保留，请人工填写标题、速度与拍号。";
      }

      const parsed = parseText(recognizedText, selected.name.replace(/\.[^.]+$/, ""));
      const confidence = Math.round(structure.staffCount
        ? structure.structuralConfidence * 0.58 + ocrConfidence * 0.42
        : ocrConfidence * 0.62);
      setAnalysis({ ...emptyAnalysis, ...structure, ...parsed, confidence: Math.max(8, Math.min(96, confidence)), recognizedText });
      setProgress(100);
      setPhase("review");
      setMessage(structure.staffCount ? "初步识别完成，请逐项确认后保存。" : "未稳定检测到五线谱线，文字结果可用，但谱面结构需要人工确认。");
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "曲谱读取失败，请换一张清晰的正面图片。");
    }
  };

  const chooseFile = (selected?: File) => {
    if (!selected) return;
    const supported = selected.type.startsWith("image/") || selected.type === "application/pdf";
    if (!supported) { setPhase("error"); setMessage("仅支持 PNG、JPG、WebP 与 PDF。"); return; }
    void analyze(selected);
  };

  const save = async () => {
    if (!file) return;
    setPhase("saving");
    setMessage("正在保存原谱和校正结果……");
    const form = new FormData();
    form.set("file", file);
    form.set("analysis", JSON.stringify(analysis));
    const response = await fetch("/api/scores/upload", { method: "POST", body: form });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setPhase("review");
      setMessage(response.status === 401 ? "识别结果已保留在当前页面。登录后才能加入个人曲库。" : (data.error ?? "保存失败，请稍后重试。"));
      return;
    }
    setPhase("saved");
    setMessage("已加入个人曲库，人工校正结果也已保存。");
    loadScores();
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(""); setAnalysis(emptyAnalysis); setPhase("idle"); setProgress(0); setMessage("");
  };

  return (
    <AppShell
      eyebrow="智能识谱 · Beta"
      title="导入你的曲谱"
      description="支持图片和 PDF 首页。自动读取标题、速度、拍号、调号，并检测五线谱、小节线与音符结构；保存前由你最终确认。"
    >
      <div className="import-layout">
        <section className="score-upload-panel">
          <header><div><p className="eyebrow">原始曲谱</p><h2>{file ? file.name : "选择曲谱文件"}</h2></div>{file && <button className="icon-button" onClick={reset} aria-label="重新选择" title="重新选择"><RotateCcw size={18} /></button>}</header>
          {!preview ? (
            <button className="score-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}>
              <span><Upload size={28} /></span>
              <strong>点击或拖入曲谱</strong>
              <small>PNG、JPG、WebP、PDF · 最大 15MB</small>
            </button>
          ) : (
            <div className="score-preview">
              {/* Object URLs and PDF-rendered blobs are intentionally displayed without image optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="待识别曲谱首页预览" />
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" hidden onChange={(event) => chooseFile(event.target.files?.[0])} />
          {(phase === "loading" || phase === "recognizing") && (
            <div className="recognition-progress"><div><LoaderCircle size={18} className="spin" /><span>{message}</span><strong>{progress}%</strong></div><i><span style={{ width: `${progress}%` }} /></i></div>
          )}
          {phase === "error" && <p className="import-error"><AlertTriangle size={17} />{message}</p>}
        </section>

        <section className="recognition-panel">
          <header><div><p className="eyebrow">机器初识 + 人工确认</p><h2>识别结果</h2></div><span className={analysis.confidence >= 75 ? "confidence good" : "confidence"}>{analysis.confidence ? `${analysis.confidence}% 置信度` : "等待识别"}</span></header>
          {phase === "idle" || phase === "loading" || phase === "recognizing" || phase === "error" ? (
            <div className="recognition-empty"><ScanLine size={40} /><strong>识别结果会出现在这里</strong><p>正面拍摄、光线均匀、谱线清楚的图片更容易获得稳定结果。</p></div>
          ) : (
            <div className="analysis-form">
              <label className="wide-field"><span>曲名</span><input value={analysis.title} onChange={(event) => setAnalysis({ ...analysis, title: event.target.value })} /></label>
              <label><span>练习类型</span><select value={analysis.track} onChange={(event) => setAnalysis({ ...analysis, track: event.target.value as Analysis["track"] })}><option value="singing">弹唱</option><option value="fingerstyle">指弹</option></select></label>
              <label><span>速度 BPM</span><input type="number" min="30" max="240" value={analysis.tempo} onChange={(event) => setAnalysis({ ...analysis, tempo: Number(event.target.value) })} /></label>
              <label><span>拍号</span><input value={analysis.timeSignature} onChange={(event) => setAnalysis({ ...analysis, timeSignature: event.target.value })} /></label>
              <label><span>调号 / 1=</span><input value={analysis.keySignature} onChange={(event) => setAnalysis({ ...analysis, keySignature: event.target.value })} /></label>
              <label><span>谱表数</span><input type="number" min="0" value={analysis.staffCount} onChange={(event) => setAnalysis({ ...analysis, staffCount: Number(event.target.value) })} /></label>
              <label><span>近似小节数</span><input type="number" min="0" value={analysis.measureCount} onChange={(event) => setAnalysis({ ...analysis, measureCount: Number(event.target.value) })} /></label>
              <label><span>近似音符数</span><input type="number" min="0" value={analysis.noteCount} onChange={(event) => setAnalysis({ ...analysis, noteCount: Number(event.target.value) })} /></label>
              <label className="wide-field"><span>识别文字</span><textarea value={analysis.recognizedText} onChange={(event) => setAnalysis({ ...analysis, recognizedText: event.target.value })} /></label>
              <div className="review-warning"><AlertTriangle size={18} /><p><strong>保存前请校对</strong><span>当前版本可稳定辅助提取版面结构和印刷文字，但复杂连音、装饰音、手写谱与完整逐音高识别仍可能出错。</span></p></div>
              <button className="primary-action save-score" onClick={save} disabled={phase === "saving"}>{phase === "saving" ? <LoaderCircle className="spin" size={18} /> : phase === "saved" ? <Check size={18} /> : <Save size={18} />}{phase === "saved" ? "已保存到个人曲库" : signedIn ? "确认并保存" : "登录后保存"}</button>
              {message && <p className={phase === "saved" ? "save-message good" : "save-message"}>{message}</p>}
            </div>
          )}
        </section>
      </div>

      <section className="personal-scores">
        <div className="section-heading"><div><p className="eyebrow">用户系统</p><h2>我的曲谱</h2></div><span>{signedIn ? `${savedScores.length} 份` : <><LockKeyhole size={14} />登录后显示</>}</span></div>
        {savedScores.length ? <div className="saved-score-grid">{savedScores.map((score) => <article key={score.id}><span className="file-mark">{score.track === "singing" ? <FileMusic /> : <FileImage />}</span><div><h3>《{score.title}》</h3><p>{score.track === "singing" ? "弹唱" : "指弹"} · {score.tempo ?? "--"} BPM · {score.timeSignature ?? "待确认"}</p></div><span className="score-confidence"><Sparkles size={14} />{score.confidence}%</span></article>)}</div> : <p className="empty-state">{signedIn ? "还没有个人曲谱。完成上方识别后，第一份曲谱会保存在这里。" : "登录后可保存原始谱面、识别结果与人工校正。"}</p>}
      </section>
    </AppShell>
  );
}
