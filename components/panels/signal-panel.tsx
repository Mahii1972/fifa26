import { MatchTimeCompact } from "@/components/match-time";
import type { WorldCupData } from "@/lib/types";

export function SignalPanel({ data }: { data: WorldCupData }) {
  const countries = [...new Set(data.stadiums.map((s) => s.country))];
  const totalCapacity = data.stadiums.reduce((sum, s) => sum + s.capacity, 0);
  const matchdays = [...new Set(data.matches.map((m) => m.matchday))].sort(
    (a, b) => a - b,
  );
  const firstMatch = data.matches[0];
  const lastMatch = data.matches[data.matches.length - 1];

  const stats = [
    { label: "NATIONS", value: data.teams.length },
    { label: "GROUPS", value: data.groups.length },
    { label: "MATCHES", value: data.matches.length },
    { label: "STADIA", value: data.stadiums.length },
    { label: "MATCHDAYS", value: matchdays.length },
    { label: "SEATS", value: `${(totalCapacity / 1_000_000).toFixed(1)}M` },
  ];

  return (
    <div className="space-y-6">
      <header className="pixel-shadow relative border-2 border-foreground bg-secondary/40 p-5">
        <p className="text-xs tracking-[0.3em] text-teletext-cyan">
          ▌TRANSMISSION 001 / OVERVIEW
        </p>
        <h2 className="font-display glow-yellow mt-4 text-lg leading-[1.5] tracking-tight text-teletext-yellow sm:text-2xl md:text-3xl">
          FIFA WORLD CUP
          <br />
          <span className="glow-magenta text-teletext-magenta">2026</span>
        </h2>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          First 48-team tournament. Hosted across {countries.join(", ")}.
          {firstMatch && lastMatch && (
            <>
              {" "}
              Tournament runs {firstMatch.localDate.split(" ")[0]} through{" "}
              {lastMatch.localDate.split(" ")[0]}.
            </>
          )}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-0 border-2 border-foreground md:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="group bg-card/40 p-4 transition-colors hover:bg-muted [&:not(:last-child)]:border-r-2 border-foreground max-md:[&:nth-child(odd)]:border-r-2 max-md:[&:nth-child(-n+4)]:border-b-2 md:[&:not(:nth-child(3n))]:border-r-2 md:[&:nth-child(-n+3)]:border-b-2 lg:border-r-2 lg:border-b-0 lg:last:border-r-0"
          >
            <p className="text-xs tracking-[0.2em] text-teletext-cyan">
              {String(i + 1).padStart(2, "0")}
            </p>
            <p className="font-display glow-yellow mt-2 text-xl text-teletext-yellow sm:text-2xl">
              {stat.value}
            </p>
            <p className="mt-1 text-sm tracking-wider text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-0 border-2 border-foreground lg:grid-cols-2">
        <section className="border-b-2 border-foreground p-5 lg:border-b-0 lg:border-r-2">
          <h3 className="font-display glow-cyan mb-4 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
            ▓ HOST MATRIX
          </h3>
          <div className="space-y-2 text-base">
            {countries.map((country) => {
              const venues = data.stadiums.filter((s) => s.country === country);
              const cap = venues.reduce((s, v) => s + v.capacity, 0);
              return (
                <div
                  key={country}
                  className="flex items-center justify-between border border-foreground/30 bg-secondary/30 px-3 py-2"
                >
                  <span className="glow-soft">{country}</span>
                  <span className="text-muted-foreground">
                    {venues.length} venues · {(cap / 1000).toFixed(0)}k cap
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="p-5">
          <h3 className="font-display glow-cyan mb-4 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
            ▓ OPENING FIXTURES
          </h3>
          <div className="space-y-0 text-base">
            {data.matches.slice(0, 6).map((match) => {
              const home = data.teams.find((t) => t.id === match.homeTeamId);
              const away = data.teams.find((t) => t.id === match.awayTeamId);
              return (
                <div
                  key={match.id}
                  className="flex items-center gap-3 border-b border-foreground/20 py-2 last:border-0"
                >
                  <span className="w-9 text-muted-foreground">
                    M{match.id.padStart(2, "0")}
                  </span>
                  <span className="w-6 text-teletext-amber">{match.group}</span>
                  <span className="glow-soft flex-1 truncate">
                    {home?.fifaCode ?? "???"} v {away?.fifaCode ?? "???"}
                  </span>
                  <MatchTimeCompact
                    localDate={match.localDate}
                    stadiumId={match.stadiumId}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
