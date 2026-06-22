"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { LiveEvent } from "@/lib/types";
import type { PpvGroup } from "@/lib/ppv-events";
import type { XyzGroup } from "@/lib/xyzstreams";

// How many events to show in each category before the "show more" accordion.
const BACKUP_TOP = 4;

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
          {label} {String(index + 1).padStart(2, "0")}
          {event.time ? ` · ${kickoff(event.time)}` : ""}
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

/**
 * One category section. Shows the first BACKUP_TOP events and tucks the rest
 * behind a "show more" accordion.
 */
function CategorySection({
  category,
  events,
  label,
  online,
}: {
  category: string;
  events: LiveEvent[];
  label: string;
  online: Record<string, number>;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? events : events.slice(0, BACKUP_TOP);
  const hidden = Math.max(0, events.length - BACKUP_TOP);
  return (
    <section className="mb-6 border-2 border-foreground last:mb-0">
      <h3 className="font-display glow-cyan border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
        ▓ {category.toUpperCase()} · {events.length}
      </h3>
      <div className="space-y-0">
        {visible.map((e, i) => (
          <EventRow
            key={e.url}
            event={e}
            index={i}
            label={label}
            online={online[e.url]}
          />
        ))}
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="font-display block w-full border-t-2 border-foreground bg-card/40 px-4 py-3 text-center text-[11px] tracking-wider text-teletext-cyan transition-colors hover:bg-muted hover:text-teletext-yellow"
        >
          {expanded ? "▲ SHOW LESS" : `▼ SHOW ${hidden} MORE`}
        </button>
      )}
    </section>
  );
}

/** Loading / error / empty states shared by both feeds. */
function FeedStatus({
  status,
  empty,
}: {
  status: "idle" | "ready" | "error";
  empty: boolean;
}) {
  if (status === "idle")
    return (
      <p className="animate-blink border-2 border-foreground p-6 text-sm tracking-wider text-teletext-cyan">
        ░ TUNING SIGNAL…
      </p>
    );
  if (status === "error")
    return (
      <p className="border-2 border-foreground p-6 text-sm tracking-wider text-teletext-amber">
        ⚠ FEED UNAVAILABLE · RETRY LATER
      </p>
    );
  if (status === "ready" && empty)
    return (
      <section className="border-2 border-foreground">
        <p className="p-6 text-sm tracking-wider text-muted-foreground">
          NO FIXTURES AVAILABLE
        </p>
      </section>
    );
  return null;
}

export function LivePanel() {
  const [online, setOnline] = useState<Record<string, number>>({});
  // Two feeds: "xyz" (xyzstreams.shop — the MAIN World Cup source) and
  // "backup1" (ppv.to — Backup Server 1). "idle" doubles as the loading state.
  const [sub, setSub] = useState<"xyz" | "backup1">("xyz");
  const [ppvGroups, setPpvGroups] = useState<PpvGroup[]>([]);
  const [ppvStatus, setPpvStatus] = useState<"idle" | "ready" | "error">(
    "idle",
  );
  const [xyzGroups, setXyzGroups] = useState<XyzGroup[]>([]);
  const [xyzStatus, setXyzStatus] = useState<"idle" | "ready" | "error">(
    "idle",
  );

  // Poll live chat occupancy so each feed shows how many are watching.
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

  // Load the xyzstreams.shop World Cup feed (MAIN) up front so its online total
  // shows on the tab without opening it.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/xyzstreams")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { groups: XyzGroup[] }) => {
        if (cancelled) return;
        setXyzGroups(d.groups ?? []);
        setXyzStatus("ready");
      })
      .catch(() => !cancelled && setXyzStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the ppv.to backup feed up front so its online total shows on the tab.
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

  // Total people watching (our chat occupancy) per feed, summed across rooms —
  // shown on the tabs so you can see where the activity is.
  const xyzOnline = useMemo(
    () =>
      xyzGroups
        .flatMap((g) => g.events)
        .reduce((sum, e) => sum + (online[e.url] ?? 0), 0),
    [xyzGroups, online],
  );
  const backupOnline = useMemo(
    () =>
      ppvGroups
        .flatMap((g) => g.events)
        .reduce((sum, e) => sum + (online[e.url] ?? 0), 0),
    [ppvGroups, online],
  );

  const subTabs: { id: "xyz" | "backup1"; label: string; online: number }[] = [
    { id: "xyz", label: "MAIN", online: xyzOnline },
    { id: "backup1", label: "BACKUP SERVER 1", online: backupOnline },
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

      <div className="mb-6 grid grid-cols-2 border-2 border-foreground">
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
            <span className="flex flex-col items-center gap-0.5">{t.label}</span>
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

      {sub === "xyz" && (
        <>
          <FeedStatus status={xyzStatus} empty={xyzGroups.length === 0} />
          {xyzStatus === "ready" &&
            xyzGroups.map((g) => (
              <CategorySection
                key={g.category}
                category={g.category}
                events={g.events}
                label="FEED"
                online={online}
              />
            ))}
        </>
      )}

      {sub === "backup1" && (
        <>
          <FeedStatus status={ppvStatus} empty={ppvGroups.length === 0} />
          {ppvStatus === "ready" &&
            ppvGroups.map((g) => (
              <CategorySection
                key={g.category}
                category={g.category}
                events={g.events}
                label="BACKUP"
                online={online}
              />
            ))}
        </>
      )}
    </div>
  );
}
