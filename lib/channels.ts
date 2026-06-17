/**
 * Always-on channels feed (third-party).
 *
 * Source: api.nuevasantino.xyz/api/channels. Like the live-events feed it gates
 * on Origin/Referer (locked to timstreams.eu), so this MUST run server-side. We
 * send the headers it expects and degrade gracefully (empty list) on failure.
 */
import type { Channel } from "./types";

const UPSTREAM = "https://api.nuevasantino.xyz/api/channels";

/**
 * Locally-defined channels we inject alongside the upstream feed. Each entry is
 * a single /live/[slug] page that bundles several run-machine-hd embeds as
 * selectable feeds, so all the sources live behind one "channel".
 */
const LOCAL_CHANNELS: Channel[] = [
  {
    url: "backup-fifa",
    name: "Backup FIFA",
    logo: "",
    genre: 2, // Sports (channels taxonomy)
    vip: false,
    streams: [
      { path: "", label: "Main" },
      { path: "/fox", label: "FOX" },
      { path: "/fox-4k", label: "FOX 4K (HEVC)" },
      { path: "/uk", label: "BBC One" },
      { path: "/telemundo", label: "Telemundo" },
      { path: "/telemundo-4k", label: "Telemundo 4K (HEVC)" },
      { path: "/zdf", label: "ZDF Germany" },
    ].map(({ path, label }) => ({
      name: label,
      url: `https://embedindia.st/embed/wc/2026-06-17/por-cod${path}`,
      vip: false,
    })),
  },
];

interface UpstreamChannel {
  url: string;
  name: string;
  logo: string;
  genre: number;
  vip: boolean;
  streams: { name: string; url: string; vip: boolean }[];
}

/** Fetch + normalize the channels feed. Never throws. */
export async function fetchChannels(revalidate = 300): Promise<Channel[]> {
  try {
    const res = await fetch(UPSTREAM, {
      headers: {
        Accept: "application/json",
        Origin: "https://timstreams.eu",
        Referer: "https://timstreams.eu/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
      },
      next: { revalidate },
    });
    if (!res.ok) return [...LOCAL_CHANNELS];

    const data = (await res.json()) as { channels?: UpstreamChannel[] };
    const channels = data.channels ?? [];

    const upstream = channels
      .filter((c) => Array.isArray(c.streams))
      .map((c) => ({
        url: c.url,
        name: c.name,
        logo: c.logo,
        genre: c.genre,
        vip: Boolean(c.vip),
        streams: c.streams.map((s) => ({
          name: s.name,
          url: s.url,
          vip: Boolean(s.vip),
        })),
      }));

    // Local channels first so they're easy to find at the top of the panel.
    return [...LOCAL_CHANNELS, ...upstream];
  } catch {
    return [...LOCAL_CHANNELS];
  }
}

/** Resolve a /live/[slug] segment to its channel, if it is one. */
export async function findChannel(
  slug: string,
  revalidate = 300,
): Promise<Channel | undefined> {
  const channels = await fetchChannels(revalidate);
  return channels.find((c) => c.url === slug);
}
