"use client";

import { useEffect, useState } from "react";
import type { LiveOverlay, WorldCupData } from "./types";

const POLL_MS = 30_000;

/**
 * Keeps the dashboard's volatile data (scores + standings) fresh by polling
 * /api/live. Static data (teams, venues, squads) comes from the initial
 * server render and is never re-fetched. Falls back silently to whatever it
 * last had if a poll fails.
 */
export function useLiveData(initial: WorldCupData): WorldCupData {
  const [data, setData] = useState(initial);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) return;
        const overlay = (await res.json()) as LiveOverlay;
        if (cancelled) return;
        setData((prev) => ({
          ...prev,
          matches: overlay.matches,
          groups: overlay.groups,
          lastUpdated: overlay.lastUpdated,
          live: overlay.live,
        }));
      } catch {
        /* keep last-known data */
      }
    }

    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return data;
}
