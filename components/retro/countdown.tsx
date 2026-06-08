"use client";

import { useEffect, useState } from "react";

function pad(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

function diffParts(targetMs: number, nowMs: number) {
  const total = Math.max(0, targetMs - nowMs);
  const sec = Math.floor(total / 1000);
  return {
    expired: total === 0,
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    mins: Math.floor((sec % 3600) / 60),
    secs: sec % 60,
  };
}

/**
 * Live countdown to a kickoff (ISO UTC). Ticks every second on the client.
 * Renders a stable placeholder before mount to avoid hydration mismatch.
 */
export function Countdown({ targetIso }: { targetIso: string }) {
  const targetMs = new Date(targetIso).getTime();
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    // Defer the first tick out of the effect body (rAF) so the initial value
    // is set in a callback, then keep ticking once a second.
    const tick = () => setNowMs(Date.now());
    const raf = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  if (nowMs === null || !Number.isFinite(targetMs)) {
    return (
      <span className="font-display glow-yellow text-teletext-yellow tabular-nums">
        --:--:--
      </span>
    );
  }

  const { expired, days, hours, mins, secs } = diffParts(targetMs, nowMs);

  if (expired) {
    return (
      <span className="font-display glow-green animate-blink text-teletext-green">
        KICKOFF
      </span>
    );
  }

  return (
    <span className="font-display glow-yellow text-teletext-yellow tabular-nums">
      {days > 0 && <span>{days}d </span>}
      {pad(hours)}:{pad(mins)}:{pad(secs)}
    </span>
  );
}
