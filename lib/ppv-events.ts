/**
 * ppv.to event feed (third-party) — the "Backup Live 1" source.
 *
 * Source: api.ppv.to/api/streams. A catalogue of events grouped by category;
 * each event has a main `iframe` (embedindia.st embed) plus `substreams`
 * (alternate broadcasters). CORS is open and there's no referer gate, but we
 * fetch server-side to normalize it into our LiveEvent shape and degrade
 * gracefully on failure (empty list).
 *
 * Each event is given a single-segment slug `ppv-<id>` so it routes through the
 * existing /live/[slug] page (which resolves it back via findPpvEvent).
 */
import type { LiveEvent, LiveStream } from "./types";

const PPV_API = "https://api.ppv.to/api/streams";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

interface PpvSubstream {
  name?: string;
  source_tag?: string;
  iframe?: string;
}

interface PpvRawEvent {
  id: number;
  name?: string;
  source_tag?: string;
  iframe?: string;
  poster?: string;
  starts_at?: number; // unix seconds
  always_live?: number;
  viewers?: string;
  substreams?: PpvSubstream[];
}

interface PpvCategory {
  category?: string;
  streams?: PpvRawEvent[];
}

export interface PpvGroup {
  category: string;
  events: LiveEvent[];
}

async function fetchCategories(revalidate: number): Promise<PpvCategory[]> {
  try {
    const res = await fetch(PPV_API, {
      headers: {
        Accept: "application/json",
        Origin: "https://ppv.to",
        Referer: "https://ppv.to/",
        "User-Agent": BROWSER_UA,
      },
      next: { revalidate },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { streams?: PpvCategory[] };
    return data.streams ?? [];
  } catch {
    return [];
  }
}

/** Main iframe + substreams → a de-duped feed list (all iframe embeds). */
function toFeeds(event: PpvRawEvent): LiveStream[] {
  const raw: { name: string; url?: string }[] = [
    { name: (event.source_tag || "Main").trim(), url: event.iframe },
    ...(event.substreams ?? []).map((s) => ({
      name: (s.source_tag || s.name || "Feed").trim(),
      url: s.iframe,
    })),
  ];
  const seen = new Set<string>();
  const feeds: LiveStream[] = [];
  for (const f of raw) {
    if (!f.url || seen.has(f.url)) continue;
    seen.add(f.url);
    feeds.push({ name: f.name, url: f.url, vip: false });
  }
  return feeds;
}

// ppv gives a real UTC epoch; the panel's kickoff() expects an ET wall-clock
// string and converts it to viewer-local. Emit the ET wall-clock of this
// instant so that conversion lands on the correct local time (the -4h here and
// the +4h in kickoff cancel, leaving the true instant rendered locally).
function etWallClock(epochSec: number): string {
  const d = new Date((epochSec - 4 * 3600) * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** ppv events grouped by category, normalized to LiveEvent rows. */
export async function fetchPpvGroups(revalidate = 30): Promise<PpvGroup[]> {
  const categories = await fetchCategories(revalidate);
  const groups: PpvGroup[] = [];
  for (const c of categories) {
    const events = (c.streams ?? [])
      .map((ev): LiveEvent => ({
        url: `ppv-${ev.id}`,
        name: ev.name ?? "Untitled",
        logo: ev.poster ?? "",
        genre: 0, // grouped by category string, not the genre taxonomy
        time: ev.always_live ? "" : etWallClock(ev.starts_at ?? 0),
        featured: false,
        vip: false,
        streams: toFeeds(ev),
      }))
      .filter((e) => e.streams.length > 0);
    if (events.length) groups.push({ category: c.category ?? "Other", events });
  }

  // Surface 24/7 channels first, then Football, then everything else in the
  // feed's own order (Array.sort is stable, so ties keep that order).
  const ORDER = ["24/7 Streams", "Football"];
  const rank = (category: string) => {
    const i = ORDER.indexOf(category);
    return i === -1 ? ORDER.length : i;
  };
  return groups.sort((a, b) => rank(a.category) - rank(b.category));
}

/** Resolve a `ppv-<id>` slug back to its name + feeds for the watch page. */
export async function findPpvEvent(
  id: string,
  revalidate = 30,
): Promise<{ name: string; streams: LiveStream[] } | undefined> {
  const categories = await fetchCategories(revalidate);
  for (const c of categories) {
    for (const ev of c.streams ?? []) {
      if (String(ev.id) !== id) continue;
      const streams = toFeeds(ev);
      if (streams.length) return { name: ev.name ?? "Stream", streams };
    }
  }
  return undefined;
}
