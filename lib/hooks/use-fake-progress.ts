"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a 0-100 progress value while `active` is true, easing towards 90%
 * over roughly `estimatedSeconds` (never reaching 100 on its own since the
 * real duration is unknown). Call with active=false once the task finishes;
 * the caller is responsible for briefly showing 100 before resetting.
 */
export function useFakeProgress(active: boolean, estimatedSeconds: number) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setProgress(4);
    const tickMs = 300;
    const steps = Math.max((estimatedSeconds * 1000) / tickMs, 5);
    const increment = 90 / steps;

    intervalRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + increment));
    }, tickMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, estimatedSeconds]);

  return { progress, setProgress };
}
