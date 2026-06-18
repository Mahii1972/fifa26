"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Channel, LiveEvent } from "@/lib/types";
import type { PpvGroup } from "@/lib/ppv-events";
import type { MovishGroup } from "@/lib/movish";
import { genreLabel } from "@/lib/types";

// How many channels to show before tucking the rest behind the accordion.
const TOP_CHANNELS = 4;

// Upstream kickoff strings are wall-clock US Eastern (UTC-4 / EDT for the
// June 2026 tournament window), regardless of venue. Convert that fixed ET
// instant into the viewer's own browser-local timezone so everyone sees the
// time where they are.
const ET_OFFSET_MIN = -240; // EDT, UTC-4

function kickoff(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  const [, y, mo, d, hh, mm] = m;
  // Resolve the ET wall-clock to a real UTC instant…
  const utcMs = Date.UTC(+y, +mo - 1, +d, +hh, +mm) - ET_OFFSET_MIN * 60_000;
  // …then read it back through the browser's local timezone.
  const local = new Date(utcMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
  const time = `${pad(local.getHours())}:${pad(local.getMinutes())}`;
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
  // Subpanels: "Main Stream" (the live feed list), "Backup Live 1" (ppv.to) and
  // "Backup Live 2" (movish.net). "idle" doubles as each backup's loading state.
  const [sub, setSub] = useState<"main" | "backup1" | "backup2">("main");
  const [ppvGroups, setPpvGroups] = useState<PpvGroup[]>([]);
  const [ppvStatus, setPpvStatus] = useState<"idle" | "ready" | "error">(
    "idle",
  );
  const [movishGroups, setMovishGroups] = useState<MovishGroup[]>([]);
  const [movishStatus, setMovishStatus] = useState<"idle" | "ready" | "error">(
    "idle",
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

  // Load the ppv.to backup feed up front so its online total shows on the tab
  // (not just after the tab is opened).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ppv-events")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { groups: PpvGroup[] }) => {
        if (cancelled) return;
        setPpvGroups(d.groups ?? []);
        setPpvStatus("ready");
      })
      .catch(() => !cancelled && setPpvStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the movish.net backup feed up front so its online total shows on the tab.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/movish-events")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { groups: MovishGroup[] }) => {
        if (cancelled) return;
        setMovishGroups(d.groups ?? []);
        setMovishStatus("ready");
      })
      .catch(() => !cancelled && setMovishStatus("error"));
    return () => {
      cancelled = true;
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

  // Total people watching (our chat occupancy) in each subpanel, summed across
  // its rooms — shown on the tabs so you can see where the activity is.
  const mainOnline = useMemo(
    () =>
      [...events, ...channels].reduce(
        (sum, x) => sum + (online[x.url] ?? 0),
        0,
      ),
    [events, channels, online],
  );
  const backupOnline = useMemo(
    () =>
      ppvGroups
        .flatMap((g) => g.events)
        .reduce((sum, e) => sum + (online[e.url] ?? 0), 0),
    [ppvGroups, online],
  );
  const backup2Online = useMemo(
    () =>
      movishGroups
        .flatMap((g) => g.events)
        .reduce((sum, e) => sum + (online[e.url] ?? 0), 0),
    [movishGroups, online],
  );

  const subTabs = [
    { id: "main" as const, label: "MAIN STREAM", online: mainOnline },
    { id: "backup1" as const, label: "BACKUP LIVE 1", online: backupOnline },
    { id: "backup2" as const, label: "BACKUP LIVE 2", online: backup2Online },
  ];

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

      <div className="mb-6 grid grid-cols-3 border-2 border-foreground">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={cn(
              "pixel-press font-display flex items-center justify-center gap-2 border-r-2 border-foreground px-3 py-3 text-center text-[9px] tracking-wider last:border-r-0 sm:text-[11px]",
              sub === t.id
                ? "glow-soft bg-primary text-primary-foreground"
                : "bg-secondary/40 text-teletext-cyan hover:bg-muted hover:text-teletext-yellow",
            )}
          >
            {t.label}
            {t.online > 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] leading-none",
                  sub === t.id
                    ? "border-primary-foreground/40 text-primary-foreground"
                    : "border-teletext-green/50 bg-teletext-green/10 text-teletext-green",
                )}
              >
                <span className="inline-block h-1.5 w-1.5 animate-blink bg-current" />
                {t.online}
              </span>
            )}
          </button>
        ))}
      </div>

      {sub === "backup1" && (
        <>
          {ppvStatus === "idle" && (
            <p className="animate-blink border-2 border-foreground p-6 text-sm tracking-wider text-teletext-cyan">
              ░ TUNING BACKUP SIGNAL…
            </p>
          )}
          {ppvStatus === "error" && (
            <p className="border-2 border-foreground p-6 text-sm tracking-wider text-teletext-amber">
              ⚠ BACKUP FEED UNAVAILABLE · RETRY LATER
            </p>
          )}
          {ppvStatus === "ready" && ppvGroups.length === 0 && (
            <section className="border-2 border-foreground">
              <p className="p-6 text-sm tracking-wider text-muted-foreground">
                NO BACKUP FIXTURES
              </p>
            </section>
          )}
          {ppvStatus === "ready" &&
            ppvGroups.map((g) => (
              <section
                key={g.category}
                className="mb-6 border-2 border-foreground last:mb-0"
              >
                <h3 className="font-display glow-cyan border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
                  ▓ {g.category.toUpperCase()} · {g.events.length}
                </h3>
                <div className="space-y-0">
                  {g.events.map((e, i) => (
                    <EventRow
                      key={e.url}
                      event={e}
                      index={i}
                      label="BACKUP"
                      online={online[e.url]}
                    />
                  ))}
                </div>
              </section>
            ))}
        </>
      )}

      {sub === "backup2" && (
        <>
          {movishStatus === "idle" && (
            <p className="animate-blink border-2 border-foreground p-6 text-sm tracking-wider text-teletext-cyan">
              ░ TUNING BACKUP SIGNAL…
            </p>
          )}
          {movishStatus === "error" && (
            <p className="border-2 border-foreground p-6 text-sm tracking-wider text-teletext-amber">
              ⚠ BACKUP FEED UNAVAILABLE · RETRY LATER
            </p>
          )}
          {movishStatus === "ready" && movishGroups.length === 0 && (
            <section className="border-2 border-foreground">
              <p className="p-6 text-sm tracking-wider text-muted-foreground">
                NO BACKUP CHANNELS
              </p>
            </section>
          )}
          {movishStatus === "ready" &&
            movishGroups.map((g) => (
              <section
                key={g.category}
                className="mb-6 border-2 border-foreground last:mb-0"
              >
                <h3 className="font-display glow-cyan border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
                  ▓ {g.category.toUpperCase()} · {g.events.length}
                </h3>
                <div className="space-y-0">
                  {g.events.map((e, i) => (
                    <EventRow
                      key={e.url}
                      event={e}
                      index={i}
                      label="CHANNEL"
                      online={online[e.url]}
                    />
                  ))}
                </div>
              </section>
            ))}
        </>
      )}

      {sub === "main" && (
        <>
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
        </>
      )}
    </div>
  );
}
