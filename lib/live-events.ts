/**
 * Live event feed (third-party).
 *
 * Source: api.nuevasantino.xyz/api/live-upcoming. The upstream gates on
 * Origin/Referer (CORS is locked to timstreams.net), so this MUST run
 * server-side — a browser fetch from our origin would be blocked. We send the
 * headers it expects and degrade gracefully (empty list) on any failure.
 *
 * We surface every sport the feed carries (see GENRES in ./types for the
 * taxonomy); the panel groups them by genre.
 */
import type { LiveEvent } from "./types";

const UPSTREAM = "https://api.nuevasantino.xyz/api/live-upcoming";

interface UpstreamEvent {
  url: string;
  name: string;
  logo: string;
  genre: number;
  time: string;
  featured: boolean;
  vip: boolean;
  streams: { name: string; url: string; vip: boolean }[];
}

/** Fetch + normalize the upstream feed (all sports). Never throws. */
export async function fetchLiveEvents(revalidate = 60): Promise<LiveEvent[]> {
  try {
    const res = await fetch(UPSTREAM, {
      headers: {
        Accept: "application/json",
        Origin: "https://timstreams.net",
        Referer: "https://timstreams.net/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
      },
      next: { revalidate },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { events?: UpstreamEvent[] };
    const events = data.events ?? [];

    return events
      .filter((e) => Array.isArray(e.streams))
      .map((e) => ({
        url: e.url,
        name: e.name,
        logo: e.logo,
        genre: e.genre,
        time: e.time,
        featured: Boolean(e.featured),
        vip: Boolean(e.vip),
        streams: e.streams.map((s) => ({
          name: s.name,
          url: s.url,
          vip: Boolean(s.vip),
        })),
      }));
  } catch {
    return [];
  }
}

/** Featured events only — the LIVE panel highlight row. */
export async function fetchFeaturedEvents(
  revalidate = 60,
): Promise<LiveEvent[]> {
  const events = await fetchLiveEvents(revalidate);
  return events
    .filter((e) => e.featured)
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** Resolve a /live/[slug] segment to its event, if it is one. */
export async function findLiveEvent(
  slug: string,
  revalidate = 60,
): Promise<LiveEvent | undefined> {
  const events = await fetchLiveEvents(revalidate);
  return events.find((e) => e.url === slug);
}
