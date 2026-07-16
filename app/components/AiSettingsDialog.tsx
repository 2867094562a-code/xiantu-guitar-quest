"use client";

import { Bot, X } from "lucide-react";
import { useRef } from "react";
import { AiRecognitionSettings } from "./AiRecognitionSettings";

export function AiSettingsDialog() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button className="header-ai-button" onClick={open} title="AI 设置与连接测试"><Bot size={17} /><span>AI 设置</span></button>
      <dialog ref={dialogRef} className="ai-settings-dialog" aria-label="AI 设置">
        <button className="dialog-close" onClick={close} aria-label="关闭 AI 设置" title="关闭"><X size={18} /></button>
        <AiRecognitionSettings onRequestClose={close} />
      </dialog>
    </>
  );
}
