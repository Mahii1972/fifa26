/**
 * movish.net World Cup channels (third-party) — the "Backup Live 2" source.
 *
 * Surfaced as a SINGLE entry ("FIFA World Cup 2026 — Live Channels"); its watch
 * page exposes every channel as a selectable feed.
 *
 * Flow: GET /world-cup yields the primary feed inline (TSN 1 → /iptv-embed/<id>)
 * plus a row of alternate channels as /live-broadcast/<slug> links (no embed id).
 * To play an alternate we fetch its channel page and pull out its
 * /iptv-embed/<id>. The channel set changes per match, so we always scrape fresh.
 */
import type { LiveEvent, LiveStream } from "./types";

const MOVISH_ORIGIN = "https://movish.net";
const MOVISH_WC = `${MOVISH_ORIGIN}/world-cup`;
// Single /live/[slug] entry that fans out to all channels as feeds.
export const MOVISH_SLUG = "movish-wc";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

interface MovishChannel {
  name: string;
  embedId?: string; // primary feed: embed id is inline on /world-cup
  channelSlug?: string; // alternates: resolve /live-broadcast/<channelSlug>
}

export interface MovishGroup {
  category: string;
  events: LiveEvent[];
}

async function fetchHtml(url: string, revalidate: number): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "text/html",
        Referer: `${MOVISH_ORIGIN}/`,
        "User-Agent": BROWSER_UA,
      },
      next: { revalidate },
    });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

/** Parse the /world-cup page into the current channel list. */
function parseChannels(html: string): MovishChannel[] {
  const channels: MovishChannel[] = [];

  // Primary feed: the first /iptv-embed/<id> on the page is the default (TSN 1).
  const primary = html.match(/iptv-embed\/(\d+)/);
  if (primary) channels.push({ name: "TSN 1", embedId: primary[1] });

  // Alternate channels: the "Match not on TSN 1?" chips link to
  // /live-broadcast/<slug> and carry a label in their last <span>.
  const chip =
    /href="https?:\/\/movish\.net\/live-broadcast\/([^"]+)"[^>]*class="wc-chip"[\s\S]*?<span>([^<]+)<\/span>\s*<\/a>/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = chip.exec(html))) {
    const channelSlug = m[1];
    if (seen.has(channelSlug)) continue;
    seen.add(channelSlug);
    channels.push({ name: m[2].trim(), channelSlug });
  }
  return channels;
}

/**
 * The movish backup as a single LiveEvent row. Its `streams` carry the channel
 * names (count → "N FEEDS"); the real embed URLs are resolved on the watch page.
 */
export async function fetchMovishGroups(revalidate = 60): Promise<MovishGroup[]> {
  const channels = parseChannels(await fetchHtml(MOVISH_WC, revalidate));
  if (!channels.length) return [];
  const event: LiveEvent = {
    url: MOVISH_SLUG,
    name: "FIFA World Cup 2026 — Live Channels",
    logo: "",
    genre: 0,
    time: "",
    featured: false,
    vip: false,
    streams: channels.map((c) => ({ name: c.name, url: "", vip: false })),
  };
  return [{ category: "FIFA World Cup", events: [event] }];
}

/** Resolve every channel to a playable iptv-embed feed (parallel). */
export async function findMovishStreams(
  revalidate = 60,
): Promise<{ name: string; streams: LiveStream[] } | undefined> {
  const channels = parseChannels(await fetchHtml(MOVISH_WC, revalidate));
  if (!channels.length) return undefined;

  const resolved = await Promise.all(
    channels.map(async (c): Promise<LiveStream | null> => {
      let embedId = c.embedId;
      if (!embedId && c.channelSlug) {
        const page = await fetchHtml(
          `${MOVISH_ORIGIN}/live-broadcast/${c.channelSlug}`,
          revalidate,
        );
        embedId = page.match(/iptv-embed\/(\d+)/)?.[1];
      }
      return embedId
        ? { name: c.name, url: `${MOVISH_ORIGIN}/iptv-embed/${embedId}`, vip: false }
        : null;
    }),
  );

  const streams = resolved.filter((s): s is LiveStream => s !== null);
  if (!streams.length) return undefined;
  return { name: "FIFA World Cup 2026", streams };
}
