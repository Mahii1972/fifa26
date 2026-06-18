"use client";

import { useMemo, useState } from "react";
import { MatchTimeRow } from "@/components/match-time";
import { StatusBadge, hasScore, isLive } from "@/components/retro/match-status";
import { VenuesPanel } from "@/components/panels/venues-panel";
import { FILTER_ACTIVE, FILTER_INACTIVE } from "@/lib/teletext";
import { cn } from "@/lib/utils";
import type { WorldCupData } from "@/lib/types";

function FixturesList({ data }: { data: WorldCupData }) {
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [matchdayFilter, setMatchdayFilter] = useState<string>("ALL");

  const teamMap = new Map(data.teams.map((t) => [t.id, t]));
  const stadiumMap = new Map(data.stadiums.map((s) => [s.id, s]));

  const groups = useMemo(
    () => ["ALL", ...[...new Set(data.matches.map((m) => m.group))].sort()],
    [data.matches],
  );

  const matchdays = useMemo(
    () => [
      "ALL",
      ...[...new Set(data.matches.map((m) => m.matchday))]
        .sort((a, b) => a - b)
        .map(String),
    ],
    [data.matches],
  );

  const filtered = useMemo(() => {
    return data.matches.filter((match) => {
      const matchesGroup =
        groupFilter === "ALL" || match.group === groupFilter;
      const matchesDay =
        matchdayFilter === "ALL" || String(match.matchday) === matchdayFilter;
      return matchesGroup && matchesDay;
    });
  }, [data.matches, groupFilter, matchdayFilter]);

  return (
    <div>
      <header className="pixel-shadow mb-6 border-2 border-foreground bg-secondary/40 p-5">
        <p className="text-xs tracking-[0.3em] text-teletext-cyan">
          ▌TRANSMISSION 004 / MATCH SCHEDULE
        </p>
        <h2 className="font-display glow-yellow mt-3 text-base tracking-tight text-teletext-yellow sm:text-lg">
          {data.matches.length} FIXTURES
        </h2>
        <p className="mt-2 text-xs text-teletext-cyan">
          DEFAULT TIMEZONE: IST (UTC+5:30) · CLICK ROW TO EXPAND ALL ZONES
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-4 border-2 border-foreground bg-card/40 p-4">
        <div>
          <p className="mb-2 text-xs tracking-widest text-teletext-cyan">
            GROUP
          </p>
          <div className="flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupFilter(g)}
                className={groupFilter === g ? FILTER_ACTIVE : FILTER_INACTIVE}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs tracking-widest text-teletext-cyan">
            MATCHDAY
          </p>
          <div className="flex flex-wrap gap-1.5">
            {matchdays.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setMatchdayFilter(d)}
                className={
                  matchdayFilter === d ? FILTER_ACTIVE : FILTER_INACTIVE
                }
              >
                {d === "ALL" ? "ALL" : `MD${d}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-2 border-foreground">
        <div className="grid grid-cols-[3rem_3rem_1fr_5rem_1fr_1fr] border-b-2 border-teletext-yellow bg-teletext-yellow px-3 py-2.5 font-display text-[8px] tracking-widest text-background max-lg:hidden">
          <span>NO</span>
          <span>GRP</span>
          <span>HOME</span>
          <span className="text-center">SCORE</span>
          <span>AWAY</span>
          <span>KICKOFF (IST) / VENUE</span>
        </div>

        {filtered.map((match) => {
          const home = teamMap.get(match.homeTeamId);
          const away = teamMap.get(match.awayTeamId);
          const stadium = stadiumMap.get(match.stadiumId);
          const played = hasScore(match);
          const live = isLive(match);
          const score = played ? `${match.homeScore}-${match.awayScore}` : "—";
          const scoreColor = live
            ? "glow-green text-teletext-green"
            : played
              ? "glow-green text-teletext-green"
              : "text-muted-foreground";

          return (
            <div
              key={match.id}
              className="border-b border-foreground/20 transition-colors last:border-0 hover:bg-muted"
            >
              {/* Desktop: single aligned row */}
              <div className="hidden px-3 py-2.5 text-base lg:grid lg:grid-cols-[3rem_3rem_1fr_5rem_1fr_1fr] lg:items-center">
                <span className="text-muted-foreground">
                  #{match.id.padStart(2, "0")}
                </span>
                <span className="font-display text-[9px] text-teletext-amber">
                  {match.group}
                </span>
                <span className="glow-soft truncate">
                  <span className="text-teletext-cyan">
                    {home?.fifaCode ?? "TBD"}
                  </span>{" "}
                  <span className="text-muted-foreground">{home?.name}</span>
                </span>
                <span className={`font-display text-center text-[9px] ${scoreColor}`}>
                  {live && (
                    <span className="glow-green animate-blink mr-1 text-teletext-green">
                      ●
                    </span>
                  )}
                  {score}
                </span>
                <span className="glow-soft truncate">
                  <span className="text-teletext-cyan">
                    {away?.fifaCode ?? "TBD"}
                  </span>{" "}
                  <span className="text-muted-foreground">{away?.name}</span>
                </span>
                <div>
                  <MatchTimeRow
                    localDate={match.localDate}
                    stadiumId={match.stadiumId}
                    venue={stadium?.fifaName}
                  />
                  {(live || match.statusDetail) && played && (
                    <div className="mt-1">
                      <StatusBadge match={match} />
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile: compact match card */}
              <div className="px-3 py-3 lg:hidden">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-[9px] text-teletext-amber">
                    GRP {match.group}
                  </span>
                  <div className="flex items-center gap-2">
                    {played && <StatusBadge match={match} />}
                    <span className="text-sm text-muted-foreground">
                      #{match.id.padStart(2, "0")}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-base">
                  <span className="glow-soft min-w-0 truncate text-right">
                    <span className="text-teletext-cyan">
                      {home?.fifaCode ?? "TBD"}
                    </span>
                  </span>
                  <span
                    className={`font-display shrink-0 px-1 text-center text-[11px] ${scoreColor}`}
                  >
                    {live && (
                      <span className="glow-green animate-blink mr-1">●</span>
                    )}
                    {score}
                  </span>
                  <span className="glow-soft min-w-0 truncate">
                    <span className="text-teletext-cyan">
                      {away?.fifaCode ?? "TBD"}
                    </span>
                  </span>
                </div>
                <div className="mt-2 text-sm">
                  <MatchTimeRow
                    localDate={match.localDate}
                    stadiumId={match.stadiumId}
                    venue={stadium?.fifaName}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-sm tracking-wider text-muted-foreground">
        SHOWING {filtered.length} OF {data.matches.length} FIXTURES
      </p>
    </div>
  );
}

/** Fixtures tab: a FIXTURES schedule subpanel and a VENUES subpanel. */
export function FixturesPanel({ data }: { data: WorldCupData }) {
  const [sub, setSub] = useState<"fixtures" | "venues">("fixtures");

  const subTabs = [
    { id: "fixtures" as const, label: "FIXTURES" },
    { id: "venues" as const, label: "VENUES" },
  ];

  return (
    <div>
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
            {t.label}
          </button>
        ))}
      </div>

      {sub === "fixtures" ? (
        <FixturesList data={data} />
      ) : (
        <VenuesPanel data={data} />
      )}
    </div>
  );
}
