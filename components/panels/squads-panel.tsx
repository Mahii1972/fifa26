"use client";

import { useMemo, useState } from "react";
import { FILTER_ACTIVE, FILTER_INACTIVE } from "@/lib/teletext";
import type { WorldCupData } from "@/lib/types";

export function SquadsPanel({ data }: { data: WorldCupData }) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("ALL");

  const groups = useMemo(
    () => ["ALL", ...[...new Set(data.teams.map((t) => t.group))].sort()],
    [data.teams],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return data.teams.filter((team) => {
      const matchesGroup = groupFilter === "ALL" || team.group === groupFilter;
      const matchesQuery =
        !q ||
        team.name.toLowerCase().includes(q) ||
        team.fifaCode.toLowerCase().includes(q);
      return matchesGroup && matchesQuery;
    });
  }, [data.teams, query, groupFilter]);

  return (
    <div>
      <header className="pixel-shadow mb-6 border-2 border-foreground bg-secondary/40 p-5">
        <p className="text-xs tracking-[0.3em] text-teletext-cyan">
          ▌TRANSMISSION 003 / NATIONAL SQUADS
        </p>
        <h2 className="font-display glow-yellow mt-3 text-base tracking-tight text-teletext-yellow sm:text-lg">
          {data.teams.length} QUALIFIED NATIONS
        </h2>
      </header>

      <div className="mb-4 flex flex-col gap-3 border-2 border-foreground bg-card/40 p-3 sm:flex-row sm:items-center">
        <span className="font-display animate-blink shrink-0 text-[10px] text-teletext-green">
          &gt;
        </span>
        <input
          type="text"
          placeholder="SEARCH CODE OR NAME..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="glow-soft flex-1 bg-transparent text-base uppercase tracking-wider outline-none placeholder:text-muted-foreground sm:text-lg"
        />
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

      <div className="grid gap-0 border-2 border-foreground sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((team, i) => (
          <div
            key={team.id}
            className="flex items-center gap-3 border-b border-r border-foreground/30 p-3 transition-colors hover:bg-muted"
          >
            <span className="w-6 text-xs text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="relative h-8 w-12 shrink-0 overflow-hidden border border-foreground/40 bg-muted">
              {team.flag ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={team.flag}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                  TBD
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="glow-soft truncate text-base leading-tight tracking-wide sm:text-lg">
                {team.name}
              </p>
              <p className="font-display mt-1 text-[8px] tracking-widest text-teletext-cyan">
                {team.fifaCode} · GRP {team.group}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="glow-magenta mt-4 text-base text-teletext-magenta">
          ⚠ NO SQUADS MATCH FILTER.
        </p>
      )}
    </div>
  );
}
