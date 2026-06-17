"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Channel, LiveEvent } from "@/lib/types";
import { genreLabel } from "@/lib/types";

// How many channels to show before tucking the rest behind the accordion.
const TOP_CHANNELS = 4;

function kickoff(iso: string): string {
  // Render the upstream venue-local time without TZ shifting.
  const [date, time] = iso.split("T");
  if (!time) return iso;
  return `${date} · ${time}`;
}

function WatchingBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1 border border-teletext-green/50 bg-teletext-green/10 px-1.5 py-0.5 text-[10px] tracking-wider text-teletext-green">
      <span className="inline-block h-1.5 w-1.5 animate-blink bg-teletext-green" />
      {count} WATCHING
    </span>
  );
}

function EventRow({
  event,
  index,
  label,
  online = 0,
}: {
  event: LiveEvent;
  index: number;
  label: string;
  online?: number;
}) {
  return (
    <Link
      href={`/live/${event.url}`}
      className="group flex items-center gap-4 border-b border-foreground/20 p-4 transition-colors last:border-0 hover:bg-muted"
    >
      {event.logo && (
        <Image
          src={event.logo}
          alt=""
          width={64}
          height={40}
          unoptimized
          className="h-10 w-16 shrink-0 border border-foreground/30 bg-black object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs tracking-widest text-teletext-amber">
          {label} {String(index + 1).padStart(2, "0")} · {kickoff(event.time)}
        </p>
        <p className="glow-soft mt-0.5 truncate text-lg leading-tight tracking-wide group-hover:text-teletext-cyan">
          {event.name}
        </p>
        <p className="mt-1 text-xs tracking-wider text-muted-foreground">
          {event.streams.length} FEED{event.streams.length === 1 ? "" : "S"}{" "}
          AVAILABLE
          <WatchingBadge count={online} />
        </p>
      </div>
      <span className="font-display shrink-0 text-[10px] tracking-wider text-teletext-cyan group-hover:text-teletext-yellow">
        WATCH ►
      </span>
    </Link>
  );
}

function ChannelCard({
  channel,
  online = 0,
}: {
  channel: Channel;
  online?: number;
}) {
  return (
    <Link
      href={`/live/${channel.url}`}
      className="group flex min-w-0 items-center gap-3 border-b border-foreground/20 p-4 transition-colors last:border-0 hover:bg-muted"
    >
      {channel.logo && (
        <Image
          src={channel.logo}
          alt=""
          width={56}
          height={36}
          unoptimized
          className="h-9 w-14 shrink-0 border border-foreground/30 bg-black object-contain"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs tracking-widest text-teletext-amber">
          24/7 CHANNEL
        </p>
        <p className="glow-cyan mt-0.5 truncate text-lg leading-tight tracking-wide text-teletext-cyan group-hover:text-teletext-yellow">
          {channel.name}
          <WatchingBadge count={online} />
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[11px] tracking-widest text-teletext-green">
        <span className="inline-block h-2.5 w-2.5 animate-blink bg-teletext-green" />
        LIVE
      </span>
    </Link>
  );
}

export function LivePanel() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsExpanded, setChannelsExpanded] = useState(false);
  const [online, setOnline] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/channels")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { channels: Channel[] }) => {
        if (!cancelled) setChannels(d.channels ?? []);
      })
      .catch(() => {
        /* channels are non-critical — leave the section empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/live-events")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { events: LiveEvent[] }) => {
        if (cancelled) return;
        setEvents(d.events ?? []);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll live chat occupancy so each match shows how many are watching.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/chat/online", { cache: "no-store" });
        if (!res.ok) return;
        const d = (await res.json()) as { counts?: Record<string, number> };
        if (!cancelled) setOnline(d.counts ?? {});
      } catch {
        /* keep last-known counts */
      }
    }
    poll();
    const id = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const featured = useMemo(() => events.filter((e) => e.featured), [events]);
  // All events grouped by sport, ordered by genre id (Football === 1 sorts
  // first). Featured events appear in the FEATURED highlight row AND under their
  // sport here. Each group keeps the upstream kickoff order from the API.
  const groups = useMemo(() => {
    const byGenre = new Map<number, LiveEvent[]>();
    for (const e of events) {
      const list = byGenre.get(e.genre);
      if (list) list.push(e);
      else byGenre.set(e.genre, [e]);
    }
    return [...byGenre.entries()].sort((a, b) => a[0] - b[0]);
  }, [events]);

  const visibleChannels = channelsExpanded
    ? channels
    : channels.slice(0, TOP_CHANNELS);
  const hiddenCount = Math.max(0, channels.length - TOP_CHANNELS);

  return (
    <div>
      <header className="pixel-shadow mb-6 border-2 border-foreground bg-secondary/40 p-5">
        <p className="text-xs tracking-[0.3em] text-teletext-cyan">
          ▌TRANSMISSION 002 / LIVE BROADCAST
        </p>
        <h2 className="font-display glow-yellow mt-3 text-base tracking-tight text-teletext-yellow sm:text-lg">
          LIVE FEEDS
        </h2>
      </header>

      <aside className="mb-6 border-2 border-teletext-amber/60 bg-teletext-amber/10 p-4">
        <p className="font-display glow-soft text-[10px] tracking-wider text-teletext-amber">
          ⚠ AD NOTICE
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Streams are served by third-party providers and contain pop-up ads.
          For an ad-free experience, use an ad blocker like{" "}
          <span className="text-teletext-cyan">uBlock Origin</span> or an
          ad-blocking browser like{" "}
          <span className="text-teletext-cyan">Brave</span>.
        </p>
      </aside>

      {channels.length > 0 && (
        <section className="mb-6 border-2 border-foreground">
          <h3 className="font-display glow-cyan border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
            ▓ 24/7 CHANNELS · {channels.length}
          </h3>
          <div className="grid gap-0 sm:grid-cols-2">
            {visibleChannels.map((c) => (
              <ChannelCard
                key={c.url}
                channel={c}
                online={online[c.url] ?? 0}
              />
            ))}
          </div>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setChannelsExpanded((v) => !v)}
              className="font-display block w-full border-t-2 border-foreground bg-card/40 px-4 py-3 text-center text-[11px] tracking-wider text-teletext-cyan transition-colors hover:bg-muted hover:text-teletext-yellow"
            >
              {channelsExpanded
                ? "▲ SHOW LESS"
                : `▼ SHOW ${hiddenCount} MORE CHANNEL${hiddenCount === 1 ? "" : "S"}`}
            </button>
          )}
        </section>
      )}

      {status === "loading" && (
        <p className="animate-blink border-2 border-foreground p-6 text-sm tracking-wider text-teletext-cyan">
          ░ TUNING SIGNAL…
        </p>
      )}
      {status === "error" && (
        <p className="border-2 border-foreground p-6 text-sm tracking-wider text-teletext-amber">
          ⚠ FEED UNAVAILABLE · RETRY LATER
        </p>
      )}

      {status === "ready" && featured.length > 0 && (
        <section className="mb-6 border-2 border-foreground">
          <h3 className="font-display glow-cyan border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
            ▓ FEATURED
          </h3>
          <div className="space-y-0">
            {featured.map((e, i) => (
              <EventRow
                key={e.url}
                event={e}
                index={i}
                label="MATCH"
                online={online[e.url]}
              />
            ))}
          </div>
        </section>
      )}

      {status === "ready" &&
        groups.map(([genre, list]) => (
          <section key={genre} className="mb-6 border-2 border-foreground last:mb-0">
            <h3 className="font-display glow-cyan border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
              ▓ {genreLabel(genre).toUpperCase()} · {list.length}
            </h3>
            <div className="space-y-0">
              {list.map((e, i) => (
                <EventRow
                  key={e.url}
                  event={e}
                  index={i}
                  label="FIXTURE"
                  online={online[e.url]}
                />
              ))}
            </div>
          </section>
        ))}

      {status === "ready" && featured.length === 0 && groups.length === 0 && (
        <section className="border-2 border-foreground">
          <p className="p-6 text-sm tracking-wider text-muted-foreground">
            NO FIXTURES SCHEDULED
          </p>
        </section>
      )}
    </div>
  );
}
