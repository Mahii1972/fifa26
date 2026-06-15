"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { LiveEvent } from "@/lib/types";

// Always-on channel surfaced as a card alongside scheduled events.
const CHANNELS = [
  { slug: "fox-sports-1", name: "FOX SPORTS 1", tag: "24/7 CHANNEL" },
  { slug: "disney-xd", name: "DISNEY XD", tag: "24/7 CHANNEL" },
];

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

export function LivePanel() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [online, setOnline] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

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
  const rest = useMemo(() => events.filter((e) => !e.featured), [events]);

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

      <section className="mb-6 border-2 border-foreground">
        <h3 className="font-display glow-cyan border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
          ▓ CHANNELS
        </h3>
        <div className="grid gap-0 sm:grid-cols-2">
          {CHANNELS.map((c) => (
            <Link
              key={c.slug}
              href={`/live/${c.slug}`}
              className="group flex items-center justify-between gap-3 border-b-2 border-foreground p-4 transition-colors last:border-b-0 hover:bg-muted sm:[&:not(:last-child)]:border-r-2 sm:[&:not(:last-child)]:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-xs tracking-widest text-teletext-amber">
                  {c.tag}
                </p>
                <p className="glow-cyan mt-0.5 text-lg leading-tight tracking-wide text-teletext-cyan">
                  {c.name}
                  <WatchingBadge count={online[c.slug] ?? 0} />
                </p>
              </div>
              <span className="flex items-center gap-2 whitespace-nowrap text-[11px] tracking-widest text-teletext-green">
                <span className="inline-block h-2.5 w-2.5 animate-blink bg-teletext-green" />
                LIVE
              </span>
            </Link>
          ))}
        </div>
      </section>

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
            ▓ FEATURED MATCHES
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

      {status === "ready" && (
        <section className="border-2 border-foreground">
          <h3 className="font-display glow-cyan border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
            ▓ FOOTBALL · {rest.length}
          </h3>
          {rest.length === 0 ? (
            <p className="p-6 text-sm tracking-wider text-muted-foreground">
              NO FURTHER FOOTBALL FIXTURES SCHEDULED
            </p>
          ) : (
            <div className="space-y-0">
              {rest.map((e, i) => (
                <EventRow
                  key={e.url}
                  event={e}
                  index={i}
                  label="FIXTURE"
                  online={online[e.url]}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
