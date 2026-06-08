"use client";

import { useMemo, useState } from "react";
import { FILTER_ACTIVE, FILTER_INACTIVE } from "@/lib/teletext";
import type { WorldCupData } from "@/lib/types";

export function VenuesPanel({ data }: { data: WorldCupData }) {
  const [countryFilter, setCountryFilter] = useState<string>("ALL");

  const countries = useMemo(
    () => [
      "ALL",
      ...[...new Set(data.stadiums.map((s) => s.country))].sort(),
    ],
    [data.stadiums],
  );

  const filtered = useMemo(() => {
    return data.stadiums
      .filter(
        (s) => countryFilter === "ALL" || s.country === countryFilter,
      )
      .sort((a, b) => b.capacity - a.capacity);
  }, [data.stadiums, countryFilter]);

  const maxCapacity = Math.max(...data.stadiums.map((s) => s.capacity));

  const hostCountries = [...new Set(data.stadiums.map((s) => s.country))];

  return (
    <div>
      <header className="pixel-shadow mb-6 border-2 border-foreground bg-secondary/40 p-5">
        <p className="text-xs tracking-[0.3em] text-teletext-cyan">
          ▌TRANSMISSION 005 / HOST STADIA
        </p>
        <h2 className="font-display glow-yellow mt-3 text-base tracking-tight text-teletext-yellow sm:text-lg">
          {data.stadiums.length} VENUES
        </h2>
      </header>

      <section className="mb-6 border-2 border-foreground">
        <h3 className="font-display glow-cyan border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
          ▓ HOST MATRIX
        </h3>
        <div className="grid gap-0 sm:grid-cols-3">
          {hostCountries.map((country, i) => {
            const venues = data.stadiums.filter((s) => s.country === country);
            const cap = venues.reduce((s, v) => s + v.capacity, 0);
            return (
              <div
                key={country}
                className={`p-4 ${
                  i < hostCountries.length - 1
                    ? "border-b-2 border-foreground sm:border-b-0 sm:[&:not(:last-child)]:border-r-2"
                    : ""
                }`}
              >
                <p className="glow-soft text-base tracking-wide">{country}</p>
                <p className="font-display glow-yellow mt-2 text-xl text-teletext-yellow">
                  {venues.length}
                  <span className="ml-1 text-xs text-muted-foreground">
                    VENUES
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(cap / 1000).toFixed(0)}k total capacity
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mb-4 flex flex-wrap gap-1.5 border-2 border-foreground bg-card/40 p-4">
        {countries.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCountryFilter(c)}
            className={
              countryFilter === c
                ? `${FILTER_ACTIVE} px-3`
                : `${FILTER_INACTIVE} px-3`
            }
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-0 border-2 border-foreground">
        {filtered.map((stadium, i) => {
          const pct = Math.round((stadium.capacity / maxCapacity) * 100);
          const matchCount = data.matches.filter(
            (m) => m.stadiumId === stadium.id,
          ).length;

          return (
            <div
              key={stadium.id}
              className="border-b border-foreground/20 p-4 transition-colors last:border-0 hover:bg-muted"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs tracking-widest text-teletext-amber">
                    VENUE {String(i + 1).padStart(2, "0")} · {stadium.region}
                  </p>
                  <h3 className="glow-cyan mt-0.5 text-lg leading-tight tracking-wide text-teletext-cyan sm:text-xl">
                    {stadium.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {stadium.fifaName}
                  </p>
                </div>
                <div className="text-right text-sm sm:text-base">
                  <p className="glow-soft">{stadium.city}</p>
                  <p className="text-muted-foreground">{stadium.country}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="h-3.5 flex-1 border border-teletext-cyan bg-secondary/60"
                  role="meter"
                  aria-valuenow={pct}
                >
                  <div
                    className="h-full bg-teletext-green"
                    style={{
                      width: `${pct}%`,
                      backgroundImage:
                        "repeating-linear-gradient(90deg, transparent 0 3px, rgba(0,0,40,0.55) 3px 4px)",
                      boxShadow: "0 0 8px rgba(0,255,90,0.6)",
                    }}
                  />
                </div>
                <span className="font-display glow-yellow w-16 text-right text-[11px] text-teletext-yellow sm:text-xs">
                  {(stadium.capacity / 1000).toFixed(0)}k
                </span>
              </div>

              <p className="mt-2 text-xs tracking-wider text-muted-foreground">
                {matchCount} FIXTURES SCHEDULED · CAPACITY RANK {pct}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
