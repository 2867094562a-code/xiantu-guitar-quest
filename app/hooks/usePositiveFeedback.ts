"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PositiveFeedback = { id: number; message: string; combo: number };

export function usePositiveFeedback() {
  const [feedback, setFeedback] = useState<PositiveFeedback | null>(null);
  const comboRef = useRef(0);
  const idRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const celebrate = useCallback((message: string) => {
    comboRef.current += 1;
    idRef.current += 1;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setFeedback({ id: idRef.current, message, combo: comboRef.current });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(12);
    timerRef.current = window.setTimeout(() => setFeedback(null), 900);
  }, []);

  const resetFeedback = useCallback(() => {
    comboRef.current = 0;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setFeedback(null);
  }, []);

  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);

  return { feedback, celebrate, resetFeedback };
}
