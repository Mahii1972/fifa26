/**
 * Streami event feed (third-party) — the "Backup Server 2" source. Lives at
 * streamic.ru (the project's current domain; formerly streami.click).
 *
 * Two endpoints:
 *  - /api/J.php          → a small JSON array of "popular" events.
 *  - /api/getEvents.php  → the full catalogue, base64-encoded JSON; needs the
 *                          site's static X-SSIG header + a Referer.
 *
 * Every event carries `_embeds`: language blocks, each with one or more iframe
 * embed URLs (third-party players, NOT m3u8). We flatten those into our
 * LiveStream feed list and group events by their `category`, mirroring the
 * ppv.to backup. Each event gets a `streami-<id>` slug so it routes through the
 * existing /live/[slug] page (resolved back via findStreamiEvent).
 */
import type { LiveEvent, LiveStream } from "./types";

const ORIGIN = "https://streamic.ru";
// Static signing header the site sends with getEvents.php (lifted from its JS).
const SSIG = "bytmo8xialhem066";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

interface StreamiEmbed {
  embed?: string;
  label?: string;
}

interface StreamiLangBlock {
  language?: string;
  // J.php sends an array; getEvents.php sends an object keyed "1","2",… —
  // Object.values() normalizes both.
  embeds?: StreamiEmbed[] | Record<string, StreamiEmbed>;
}

interface StreamiRawEvent {
  id: string | number;
  title?: string;
  category?: string;
  league?: string;
  countryCode?: string;
  startTime?: number; // unix seconds
  _embeds?: StreamiLangBlock[];
}

export interface StreamiGroup {
  category: string;
  events: LiveEvent[];
}

// streami's feed labels categories in Polish (plus a few English). Map them to
// clean English; unknown values fall back to a title-cased version.
const CATEGORY_LABELS: Record<string, string> = {
  pilkanozna: "Football",
  siatkowka: "Volleyball",
  koszykowka: "Basketball",
  tenis: "Tennis",
  dart: "Darts",
  krykiet: "Cricket",
  kolarstwo: "Cycling",
  jezdziectwo: "Equestrian",
  magazyn: "Shows",
  americanfootball: "American Football",
  australianfootball: "Australian Football",
  motorsport: "Motorsport",
  baseball: "Baseball",
  futsal: "Futsal",
  wrestling: "Wrestling",
  triathlon: "Triathlon",
  mma: "MMA",
};

function categoryLabel(raw: string): string {
  // "_wazne" = Polish "important"; fold it into the base category (e.g.
  // "pilkanozna_wazne" → Football) so it doesn't show up as its own heading.
  const key = raw
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/wazne$/, "");
  return (
    CATEGORY_LABELS[key] ??
    raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
  );
}

/** Flatten an event's language blocks into a de-duped iframe feed list. */
function toFeeds(ev: StreamiRawEvent): LiveStream[] {
  const seen = new Set<string>();
  const feeds: LiveStream[] = [];
  for (const block of ev._embeds ?? []) {
    const embeds = block.embeds;
    const list = Array.isArray(embeds) ? embeds : Object.values(embeds ?? {});
    for (const e of list) {
      const url = e?.embed?.trim();
      if (!url || !/^https?:\/\//i.test(url)) continue;
      // Skip the feed's placeholder ("coming soon" rows point at google.com).
      let host = "";
      try {
        host = new URL(url).hostname;
      } catch {
        continue;
      }
      if (/(^|\.)google\.com$/i.test(host)) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      const lang = (block.language || "Feed").trim();
      const label = (e.label || "").trim();
      feeds.push({ name: label ? `${lang} · ${label}` : lang, url, vip: false });
    }
  }
  return feeds;
}

// streami gives a real UTC epoch; the LIVE panel's kickoff() expects an ET
// wall-clock string and converts it to viewer-local. Emit the ET wall-clock of
// this instant so that conversion lands on the correct local time (the same
// trick ppv-events.ts uses).
function etWallClock(epochSec: number): string {
  const d = new Date((epochSec - 4 * 3600) * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** The full catalogue (base64-encoded JSON). Degrades to []. */
async function fetchCatalogue(revalidate: number): Promise<StreamiRawEvent[]> {
  try {
    const res = await fetch(`${ORIGIN}/api/getEvents.php`, {
      headers: {
        Accept: "*/*",
        Referer: `${ORIGIN}/`,
        "User-Agent": BROWSER_UA,
        "X-SSIG": SSIG,
        "Sec-Fetch-Site": "same-origin",
      },
      next: { revalidate },
    });
    if (!res.ok) return [];
    const json = JSON.parse(Buffer.from(await res.text(), "base64").toString("utf-8"));
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

/** The "popular" feed (plain JSON). Degrades to []. */
async function fetchPopular(revalidate: number): Promise<StreamiRawEvent[]> {
  try {
    const res = await fetch(`${ORIGIN}/api/J.php`, {
      headers: { Accept: "application/json", Referer: `${ORIGIN}/`, "User-Agent": BROWSER_UA },
      next: { revalidate },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

/**
 * Both feeds merged + de-duped by id (popular entries kept first so they win),
 * plus the set of ids the popular feed flagged.
 */
async function fetchSources(
  revalidate: number,
): Promise<{ all: StreamiRawEvent[]; popularIds: Set<string> }> {
  const [popular, catalogue] = await Promise.all([
    fetchPopular(revalidate),
    fetchCatalogue(revalidate),
  ]);
  const popularIds = new Set(
    popular.map((e) => (e?.id != null ? String(e.id) : "")).filter(Boolean),
  );
  const byId = new Map<string, StreamiRawEvent>();
  for (const e of [...popular, ...catalogue]) {
    const id = e?.id != null ? String(e.id) : "";
    if (id && !byId.has(id)) byId.set(id, e);
  }
  return { all: [...byId.values()], popularIds };
}

/** Map a raw event → LiveEvent row (null if it has no real feed). */
function toLiveEvent(ev: StreamiRawEvent): LiveEvent | null {
  const streams = toFeeds(ev);
  if (!streams.length) return null;
  return {
    url: `streami-${ev.id}`,
    name: ev.title ?? "Untitled",
    logo: "",
    genre: 0,
    time: ev.startTime ? etWallClock(ev.startTime) : "",
    featured: false,
    vip: false,
    streams,
  };
}

/**
 * streami events grouped for the panel: a "Popular" section first (from the
 * J.php feed), then categories — Football, Cricket, then the rest by count.
 * Popular events still also appear under their own category, like featured
 * matches do on the main panel.
 */
export async function fetchStreamiGroups(revalidate = 60): Promise<StreamiGroup[]> {
  const { all, popularIds } = await fetchSources(revalidate);
  const byCategory = new Map<string, LiveEvent[]>();
  const popular: LiveEvent[] = [];

  for (const ev of all) {
    const event = toLiveEvent(ev);
    if (!event) continue; // drop events with no real feed
    if (popularIds.has(String(ev.id))) popular.push(event);
    const category = categoryLabel((ev.category || "Other").trim() || "Other");
    const list = byCategory.get(category);
    if (list) list.push(event);
    else byCategory.set(category, [event]);
  }

  // Football first, then Cricket, then the rest by event count (desc).
  const ORDER = ["Football", "Cricket"];
  const rank = (c: string) => {
    const i = ORDER.indexOf(c);
    return i === -1 ? ORDER.length : i;
  };
  const categoryGroups = [...byCategory.entries()]
    .map(([category, events]) => ({ category, events }))
    .sort((a, b) => rank(a.category) - rank(b.category) || b.events.length - a.events.length);

  // Popular pinned to the very top when the feed flags any.
  return popular.length
    ? [{ category: "🔥 Popular", events: popular }, ...categoryGroups]
    : categoryGroups;
}

/** Resolve a `streami-<id>` slug back to its name + feeds for the watch page. */
export async function findStreamiEvent(
  id: string,
  revalidate = 60,
): Promise<{ name: string; streams: LiveStream[] } | undefined> {
  const { all } = await fetchSources(revalidate);
  const ev = all.find((e) => String(e.id) === id);
  if (!ev) return undefined;
  const streams = toFeeds(ev);
  return streams.length ? { name: ev.title ?? "Stream", streams } : undefined;
}
