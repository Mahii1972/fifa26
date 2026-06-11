"use client";

import { useEffect, useState } from "react";
import { Countdown } from "./countdown";
import { getAllTimezoneLines } from "@/lib/timezones";
import type { Match, Stadium, Team } from "@/lib/types";

function kickoffMs(m: Match): number {
  return m.kickoffUtc ? new Date(m.kickoffUtc).getTime() : Number.POSITIVE_INFINITY;
}

function TeamSide({ team, align }: { team?: Team; align: "left" | "right" }) {
  const flag = team?.flag ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={team.flag}
      alt=""
      className="h-5 w-7 shrink-0 border border-foreground/40 object-cover sm:h-6 sm:w-9"
    />
  ) : null;

  const text = (
    <div className="min-w-0">
      <p className="font-display glow-cyan text-sm text-teletext-cyan sm:text-base">
        {team?.fifaCode ?? "TBD"}
      </p>
      <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
        {team?.name}
      </p>
    </div>
  );

  // Home (left col) hugs the centre on its right; away (right col) on its left.
  return align === "left" ? (
    <div className="flex min-w-0 items-center justify-end gap-2 text-right">
      {text}
      {flag}
    </div>
  ) : (
    <div className="flex min-w-0 items-center justify-start gap-2">
      {flag}
      {text}
    </div>
  );
}

/** Compact stacked team chip (flag over code) used in the mobile layout. */
function TeamChip({ team }: { team?: Team }) {
  return (
    <div className="flex w-20 flex-col items-center gap-1 text-center">
      {team?.flag && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.flag}
          alt=""
          className="h-7 w-10 border border-foreground/40 object-cover"
        />
      )}
      <span className="font-display glow-cyan text-base text-teletext-cyan">
        {team?.fifaCode ?? "TBD"}
      </span>
      <span className="w-full truncate text-[10px] text-muted-foreground">
        {team?.name}
      </span>
    </div>
  );
}

/**
 * "Next match" hero — shows the in-progress match (with live score + clock) or
 * counts down to the next scheduled kickoff. All time-of-day logic runs after
 * mount to stay clear of hydration mismatches.
 */
export function NextMatchCard({
  matches,
  teams,
  stadiums,
}: {
  matches: Match[];
  teams: Team[];
  stadiums: Stadium[];
}) {
  // Recompute "next match" each minute; null until mounted (avoids hydration
  // drift from server/client clock differences).
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const raf = requestAnimationFrame(tick);
    const id = setInterval(tick, 30_000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const stadiumMap = new Map(stadiums.map((s) => [s.id, s]));

  const now = nowMs ?? 0;
  // ESPN sometimes lags flipping a kicked-off match to "in" (it may still read
  // "pre"). Without bridging that gap the match falls out of "upcoming" (its
  // kickoff is past) yet isn't "live" either, so the hero skips to the next
  // fixture. Treat a not-yet-finished match whose kickoff has recently passed
  // as in-progress until ESPN catches up or it goes "post".
  const KICKOFF_GRACE_MS = 2.5 * 60 * 60 * 1000;
  const espnLive = matches.find((m) => m.state === "in");
  const presumedLive = matches.find(
    (m) =>
      m.state !== "post" &&
      m.state !== "in" &&
      kickoffMs(m) <= now &&
      now - kickoffMs(m) < KICKOFF_GRACE_MS,
  );
  const upcoming = matches
    .filter((m) => m.state !== "post" && m.state !== "in")
    .filter((m) => kickoffMs(m) > now)
    .sort((a, b) => kickoffMs(a) - kickoffMs(b));

  const target = espnLive ?? presumedLive ?? upcoming[0];

  const home = target ? teamMap.get(target.homeTeamId) : undefined;
  const away = target ? teamMap.get(target.awayTeamId) : undefined;
  const stadium = target ? stadiumMap.get(target.stadiumId) : undefined;
  // ESPN-confirmed live (real score + clock) vs. presumed live (kickoff passed,
  // ESPN feed still catching up — we don't trust the 0-0 it reports).
  const isLive = target?.state === "in";
  const isPresumedLive = !isLive && !!target && target === presumedLive;
  const showingLive = isLive || isPresumedLive;

  const kickoffLabel =
    target && getAllTimezoneLines(target.localDate, target.stadiumId)?.primary;

  // Shared score-or-countdown block (same on mobile + desktop).
  const center = target && (
    <div className="text-center">
      {isLive ? (
        <>
          <p className="font-display glow-green text-3xl text-teletext-green tabular-nums">
            {target.homeScore}-{target.awayScore}
          </p>
          <p className="glow-green animate-blink mt-1 text-[10px] tracking-widest text-teletext-green">
            {target.displayClock || "LIVE"}
          </p>
        </>
      ) : isPresumedLive ? (
        <>
          <p className="font-display glow-green animate-blink text-3xl text-teletext-green">
            LIVE
          </p>
          <p className="mt-1 text-[10px] tracking-widest text-teletext-green">
            IN PROGRESS
          </p>
        </>
      ) : (
        <>
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground">
            KICKOFF IN
          </p>
          <p className="mt-1 whitespace-nowrap text-2xl">
            <Countdown targetIso={target.kickoffUtc ?? ""} />
          </p>
        </>
      )}
    </div>
  );

  return (
    <section className="pixel-shadow relative border-2 border-foreground bg-secondary/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <p
          className={`font-display text-[10px] tracking-[0.25em] ${
            showingLive ? "glow-green text-teletext-green" : "text-teletext-cyan"
          }`}
        >
          {showingLive ? "● LIVE NOW" : "▌NEXT KICKOFF"}
        </p>
        {target && (
          <span className="font-display text-[9px] tracking-widest text-teletext-amber">
            GRP {target.group} · MD{target.matchday}
          </span>
        )}
      </div>

      {!target ? (
        <p className="py-6 text-center text-sm tracking-widest text-muted-foreground">
          GROUP STAGE COMPLETE
        </p>
      ) : (
        <>
          {/* Mobile: teams on one row, countdown big underneath. */}
          <div className="sm:hidden">
            <div className="flex items-start justify-center gap-4">
              <TeamChip team={home} />
              <span className="font-display mt-3 text-[10px] tracking-widest text-muted-foreground">
                VS
              </span>
              <TeamChip team={away} />
            </div>
            <div className="mt-4">{center}</div>
          </div>

          {/* Desktop: team — center — team. */}
          <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-4 sm:grid">
            <TeamSide team={home} align="left" />
            <div className="shrink-0 px-1">{center}</div>
            <TeamSide team={away} align="right" />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-foreground/20 pt-3 text-center text-[11px] text-muted-foreground sm:justify-between sm:text-left sm:text-xs">
            <span className="glow-soft">
              {stadium?.fifaName ?? stadium?.name}
              {stadium ? ` · ${stadium.city}` : ""}
            </span>
            {!isLive && kickoffLabel && (
              <span className="text-teletext-yellow">{kickoffLabel}</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
