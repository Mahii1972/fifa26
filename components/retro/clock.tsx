"use client";

import { useEffect, useState } from "react";

export function BroadcastClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="glow-cyan text-base tabular-nums tracking-wider text-teletext-cyan sm:text-lg">
      {time || "--:--:--"}
    </span>
  );
}