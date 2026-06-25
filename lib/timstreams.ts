/**
 * TimStreams-style event feed (third-party) — Backup Server 3.
 *
 * Sources:
 *  - api.vixnuvew.uk/api/live-upcoming
 *  - api.vixnuvew.uk/api/channels
 *
 * The upstream allows timstreams.st as its browser origin, so we proxy it
 * server-side with those headers and normalize both feeds into the existing
 * LiveEvent shape used by the LIVE panel.
 */
import type { LiveEvent, LiveStream } from "./types";
import { genreLabel } from "./types";

const ORIGIN = "https://timstreams.st";
const API = "https://api.vixnuvew.uk";
const EVENTS_ENDPOINT = `${API}/api/live-upcoming`;
const CHANNELS_ENDPOINT = `${API}/api/channels`;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

interface TimstreamsRawEvent {
  url?: string;
  name?: string;
  logo?: string;
  genre?: number;
  time?: string;
  featured?: boolean;
  vip?: boolean;
  streams?: { name?: string; url?: string; vip?: boolean }[];
}

interface TimstreamsRawChannel {
  url?: string;
  name?: string;
  logo?: string;
  genre?: number;
  vip?: boolean;
  streams?: { name?: string; url?: string; vip?: boolean }[];
}

interface TimstreamsChannelsResponse {
  channels?: TimstreamsRawChannel[];
  genres?: Record<string, string>;
}

export interface TimstreamsGroup {
  category: string;
  events: LiveEvent[];
}

function channelGenreLabel(
  genre: number,
  labels: Record<string, string>,
): string {
  return labels[String(genre)] ?? "Other Channels";
}

function requestHeaders(): HeadersInit {
  return {
    Accept: "*/*",
    "Content-Type": "application/json",
    Origin: ORIGIN,
    Referer: `${ORIGIN}/`,
    "User-Agent": BROWSER_UA,
  };
}

function toStreams(raw: TimstreamsRawEvent | TimstreamsRawChannel): LiveStream[] {
  const seen = new Set<string>();
  const streams: LiveStream[] = [];
  for (const stream of raw.streams ?? []) {
    const url = stream.url?.trim();
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    streams.push({
      name: stream.name?.trim() || "Live Stream",
      url,
      vip: Boolean(stream.vip),
    });
  }
  return streams;
}

function toLiveEvent(raw: TimstreamsRawEvent, prefix = "timstreams"): LiveEvent | null {
  const url = raw.url?.trim();
  const streams = toStreams(raw);
  if (!url || !streams.length) return null;
  return {
    url: `${prefix}-${url}`,
    name: raw.name?.trim() || "Untitled",
    logo: raw.logo?.trim() || "",
    genre: raw.genre ?? 17,
    time: raw.time?.trim() || "",
    featured: Boolean(raw.featured),
    vip: Boolean(raw.vip),
    streams,
  };
}

function toLiveChannel(raw: TimstreamsRawChannel): LiveEvent | null {
  const url = raw.url?.trim();
  const streams = toStreams(raw);
  if (!url || !streams.length) return null;
  return {
    url: `timstreams-channel-${url}`,
    name: raw.name?.trim() || "Untitled",
    logo: raw.logo?.trim() || "",
    genre: raw.genre ?? 0,
    time: "",
    featured: false,
    vip: Boolean(raw.vip),
    streams,
  };
}

async function fetchEvents(revalidate: number): Promise<LiveEvent[]> {
  try {
    const res = await fetch(EVENTS_ENDPOINT, {
      headers: requestHeaders(),
      next: { revalidate },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: TimstreamsRawEvent[] };
    return (data.events ?? [])
      .map((event) => toLiveEvent(event))
      .filter((event): event is LiveEvent => Boolean(event))
      .sort((a, b) => a.time.localeCompare(b.time));
  } catch {
    return [];
  }
}

async function fetchChannels(
  revalidate: number,
): Promise<{ channels: LiveEvent[]; genres: Record<string, string> }> {
  try {
    const res = await fetch(CHANNELS_ENDPOINT, {
      headers: requestHeaders(),
      next: { revalidate },
    });
    if (!res.ok) return { channels: [], genres: {} };
    const data = (await res.json()) as TimstreamsChannelsResponse;
    const channels = (data.channels ?? [])
      .map(toLiveChannel)
      .filter((channel): channel is LiveEvent => Boolean(channel))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { channels, genres: data.genres ?? {} };
  } catch {
    return { channels: [], genres: {} };
  }
}

export async function fetchTimstreamsGroups(
  revalidate = 60,
): Promise<TimstreamsGroup[]> {
  const [events, channelSource] = await Promise.all([
    fetchEvents(revalidate),
    fetchChannels(revalidate),
  ]);
  const { channels, genres: channelGenres } = channelSource;
  const featured = events.filter((event) => event.featured);
  const byGenre = new Map<string, LiveEvent[]>();
  const byChannelGenre = new Map<string, LiveEvent[]>();

  for (const event of events) {
    const category = genreLabel(event.genre);
    const list = byGenre.get(category);
    if (list) list.push(event);
    else byGenre.set(category, [event]);
  }

  for (const channel of channels) {
    const category = `24/7 ${channelGenreLabel(channel.genre, channelGenres)}`;
    const list = byChannelGenre.get(category);
    if (list) list.push(channel);
    else byChannelGenre.set(category, [channel]);
  }

  const genreGroups = [...byGenre.entries()]
    .map(([category, groupedEvents]) => ({ category, events: groupedEvents }))
    .sort((a, b) => b.events.length - a.events.length);
  const channelGroups = [...byChannelGenre.entries()]
    .map(([category, groupedEvents]) => ({ category, events: groupedEvents }))
    .sort((a, b) => a.category.localeCompare(b.category));

  const eventGroups = featured.length
    ? [{ category: "Featured", events: featured }, ...genreGroups]
    : genreGroups;
  return [...eventGroups, ...channelGroups];
}

/** Resolve a `timstreams-<slug>` row back to its playable feeds. */
export async function findTimstreamsEvent(
  slug: string,
  revalidate = 60,
): Promise<{ name: string; streams: LiveStream[] } | undefined> {
  if (slug.startsWith("channel-")) {
    const { channels } = await fetchChannels(revalidate);
    const channel = channels.find((item) => item.url === `timstreams-${slug}`);
    return channel ? { name: channel.name, streams: channel.streams } : undefined;
  }

  const events = await fetchEvents(revalidate);
  const event = events.find((item) => item.url === `timstreams-${slug}`);
  return event ? { name: event.name, streams: event.streams } : undefined;
}
