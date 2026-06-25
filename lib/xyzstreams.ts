/**
 * xyzstreams.st World Cup feed (third-party) — the "Backup Live 3" source.
 *
 * Their /wc-1 page is a World Cup hub: a single inline `const streams = [...]`
 * array of broadcaster feeds (FOX, BBC, TSN, beIN, Telemundo + 4K variants).
 * Each feed carries a self-contained iframe embed page (`/wc-N-embed.html`) that
 * plays the feed's HLS stream via Clappr in the viewer's browser — no auth
 * handshake, no m3u8 extraction on our side, no mixed content (all HTTPS).
 *
 * We scrape that array server-side and surface every feed as a LiveStream on a
 * single "FIFA World Cup — Live" event, mirroring the ppv.to / streami backups.
 * The event gets an `xyz-wc` slug routed through /live/[slug] (findXyzStream),
 * where StreamPlayer iframes the chosen feed and lets the viewer switch sources.
 */
import type { LiveEvent, LiveStream } from "./types";

const ORIGIN = "https://xyzstreams.st";
// The World Cup hub page that aggregates every broadcaster feed.
const HUB = `${ORIGIN}/wc-1`;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

// Single aggregated event slug — there is one World Cup hub, many feeds.
const EVENT_SLUG = "xyz-wc";
const EVENT_NAME = "FIFA World Cup — Live";

export interface XyzGroup {
  category: string;
  events: LiveEvent[];
}

/**
 * Pull the inline `const streams = [ ... ];` array out of the hub HTML and read
 * each feed's button name + embed URL. Feeds without an embed page (e.g. the
 * raw MPEG-DASH "direct" entry) are skipped; duplicates are de-duped by URL.
 */
function parseFeeds(html: string): LiveStream[] {
  const block = html.match(/const\s+streams\s*=\s*\[([\s\S]*?)\];/);
  if (!block) return [];
  const seen = new Set<string>();
  const feeds: LiveStream[] = [];
  for (const obj of block[1].match(/\{[\s\S]*?\}/g) ?? []) {
    const url = obj.match(/embedUrl\s*:\s*"([^"]+)"/)?.[1]?.trim();
    if (!url || !/^https?:\/\//i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    const name =
      obj.match(/btnName\s*:\s*"([^"]+)"/)?.[1]?.trim() ||
      obj.match(/title\s*:\s*"([^"]+)"/)?.[1]?.trim() ||
      "Feed";
    feeds.push({ name, url, vip: false });
  }
  return feeds;
}

/** The hub's broadcaster feeds. Degrades to [] on any failure. */
async function fetchFeeds(revalidate: number): Promise<LiveStream[]> {
  try {
    const res = await fetch(HUB, {
      headers: {
        Accept: "text/html,*/*",
        Referer: `${ORIGIN}/`,
        "User-Agent": BROWSER_UA,
      },
      next: { revalidate },
    });
    if (!res.ok) return [];
    return parseFeeds(await res.text());
  } catch {
    return [];
  }
}

/**
 * xyzstreams feeds grouped for the panel: a single "FIFA World Cup" group with
 * one event whose feeds are the available broadcasters. Empty when the hub is
 * unreachable or exposes no embeddable feed.
 */
export async function fetchXyzStreams(revalidate = 60): Promise<XyzGroup[]> {
  const streams = await fetchFeeds(revalidate);
  if (!streams.length) return [];
  const event: LiveEvent = {
    url: EVENT_SLUG,
    name: EVENT_NAME,
    logo: "",
    genre: 0,
    time: "",
    featured: false,
    vip: false,
    streams,
  };
  return [{ category: "FIFA World Cup", events: [event] }];
}

/** Resolve an `xyz-*` slug back to the World Cup feeds for the watch page. */
export async function findXyzStream(
  _id: string,
  revalidate = 60,
): Promise<{ name: string; streams: LiveStream[] } | undefined> {
  const streams = await fetchFeeds(revalidate);
  return streams.length ? { name: EVENT_NAME, streams } : undefined;
}
