/**
 * movish.net channels (third-party) — the "Backup Live 2" source.
 *
 * Two groups:
 *  - "FIFA World Cup": a single entry whose watch page fans out to every WC
 *    channel as a selectable feed (scraped fresh from /world-cup, since the set
 *    changes per match).
 *  - "24/7 Channels": a curated set of always-on entertainment channels.
 *
 * Flow: each channel is a /live-broadcast/<slug> page whose playable stream is
 * its inline /iptv-embed/<id>. We resolve that id when the watch page opens.
 */
import type { LiveEvent, LiveStream } from "./types";

const MOVISH_ORIGIN = "https://movish.net";
const MOVISH_WC = `${MOVISH_ORIGIN}/world-cup`;
// Single /live/[slug] entry that fans out to all WC channels as feeds.
export const MOVISH_SLUG = "movish-wc";
// Prefix for a single movish channel: /live/movish-ch-<channelSlug>.
const CHANNEL_PREFIX = "movish-ch-";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

// Curated always-on entertainment channels (movish /live-broadcast slugs).
const CHANNELS_247: { name: string; slug: string }[] = [
  { name: "HBO", slug: "hbo-usa" },
  { name: "Cinemax", slug: "cinemax-usa" },
  { name: "AMC", slug: "amc-usa" },
  { name: "Comedy Central", slug: "comedy-central" },
  { name: "Cartoon Network", slug: "cartoon-network" },
  { name: "Adult Swim", slug: "adult-swim" },
  { name: "Disney XD", slug: "disney-xd" },
];

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

/** Resolve a /live-broadcast/<slug> channel page to its iptv-embed URL. */
async function resolveChannelEmbed(
  channelSlug: string,
  revalidate: number,
): Promise<string | undefined> {
  const page = await fetchHtml(
    `${MOVISH_ORIGIN}/live-broadcast/${channelSlug}`,
    revalidate,
  );
  const id = page.match(/iptv-embed\/(\d+)/)?.[1];
  return id ? `${MOVISH_ORIGIN}/iptv-embed/${id}` : undefined;
}

/** Parse the /world-cup page into the current WC channel list. */
function parseWorldCupChannels(html: string): MovishChannel[] {
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

/** A LiveEvent row carrying `count` placeholder feeds (resolved on watch). */
function channelRow(url: string, name: string, feeds: string[]): LiveEvent {
  return {
    url,
    name,
    logo: "",
    genre: 0,
    time: "",
    featured: false,
    vip: false,
    streams: feeds.map((n) => ({ name: n, url: "", vip: false })),
  };
}

/** Backup Live 2 listing: the WC entry + the curated 24/7 channels. */
export async function fetchMovishGroups(revalidate = 60): Promise<MovishGroup[]> {
  const groups: MovishGroup[] = [];

  const wc = parseWorldCupChannels(await fetchHtml(MOVISH_WC, revalidate));
  if (wc.length) {
    groups.push({
      category: "FIFA World Cup",
      events: [
        channelRow(
          MOVISH_SLUG,
          "FIFA World Cup 2026 — Live Channels",
          wc.map((c) => c.name),
        ),
      ],
    });
  }

  groups.push({
    category: "24/7 Channels",
    events: CHANNELS_247.map((c) =>
      channelRow(`${CHANNEL_PREFIX}${c.slug}`, c.name, [c.name]),
    ),
  });

  return groups;
}

/** Resolve every WC channel to a playable iptv-embed feed (parallel). */
async function findWorldCupStreams(
  revalidate: number,
): Promise<{ name: string; streams: LiveStream[] } | undefined> {
  const channels = parseWorldCupChannels(await fetchHtml(MOVISH_WC, revalidate));
  if (!channels.length) return undefined;

  const resolved = await Promise.all(
    channels.map(async (c): Promise<LiveStream | null> => {
      const url = c.embedId
        ? `${MOVISH_ORIGIN}/iptv-embed/${c.embedId}`
        : c.channelSlug
          ? await resolveChannelEmbed(c.channelSlug, revalidate)
          : undefined;
      return url ? { name: c.name, url, vip: false } : null;
    }),
  );

  const streams = resolved.filter((s): s is LiveStream => s !== null);
  if (!streams.length) return undefined;
  return { name: "FIFA World Cup 2026", streams };
}

/** Resolve any `movish-` slug (the WC fan-out or a single 24/7 channel). */
export async function findMovishStream(
  slug: string,
  revalidate = 60,
): Promise<{ name: string; streams: LiveStream[] } | undefined> {
  if (slug === MOVISH_SLUG) return findWorldCupStreams(revalidate);

  if (slug.startsWith(CHANNEL_PREFIX)) {
    const channelSlug = slug.slice(CHANNEL_PREFIX.length);
    const name =
      CHANNELS_247.find((c) => c.slug === channelSlug)?.name ?? channelSlug;
    const url = await resolveChannelEmbed(channelSlug, revalidate);
    return url ? { name, streams: [{ name, url, vip: false }] } : undefined;
  }

  return undefined;
}
