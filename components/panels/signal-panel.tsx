import { NextMatchCard } from "@/components/retro/next-match";
import {
  StatusBadge,
  hasScore,
  isFinished,
  isLive,
} from "@/components/retro/match-status";
import { getAllTimezoneLines } from "@/lib/timezones";
import type { Match, WorldCupData } from "@/lib/types";

function kickoffMs(m: Match): number {
  return m.kickoffUtc ? new Date(m.kickoffUtc).getTime() : Number.POSITIVE_INFINITY;
}

function fixtureStageLabel(group: string): string {
  return group === "R32" ? "R32" : group;
}

export function SignalPanel({ data }: { data: WorldCupData }) {
  const countries = [...new Set(data.stadiums.map((s) => s.country))];
  const totalCapacity = data.stadiums.reduce((sum, s) => sum + s.capacity, 0);
  const matchdays = [...new Set(data.matches.map((m) => m.matchday))].sort(
    (a, b) => a - b,
  );
  const firstMatch = data.matches[0];
  const lastMatch = data.matches[data.matches.length - 1];
  const teamMap = new Map(data.teams.map((t) => [t.id, t]));

  const stats = [
    { label: "NATIONS", value: data.teams.length },
    { label: "GROUPS", value: data.groups.length },
    { label: "MATCHES", value: data.matches.length },
    { label: "STADIA", value: data.stadiums.length },
    { label: "MATCHDAYS", value: matchdays.length },
    { label: "SEATS", value: `${(totalCapacity / 1_000_000).toFixed(1)}M` },
  ];

  // Most recently played match (live or finished) — the last result we have.
  const lastUpdated = [...data.matches]
    .filter((m) => isLive(m) || isFinished(m))
    .sort((a, b) => kickoffMs(b) - kickoffMs(a))[0];

  // Fixtures that haven't kicked off yet, soonest first.
  const upcoming = [...data.matches]
    .filter((m) => !isLive(m) && !isFinished(m))
    .sort((a, b) => kickoffMs(a) - kickoffMs(b));

  // First row is the last updated match; the rest are upcoming fixtures.
  const signalFixtures = (
    lastUpdated ? [lastUpdated, ...upcoming] : upcoming
  ).slice(0, 6);

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

      <NextMatchCard
        matches={data.matches}
        teams={data.teams}
        stadiums={data.stadiums}
      />

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

      <section className="border-2 border-foreground">
        <div className="flex items-center justify-between border-b-2 border-foreground bg-card/40 px-4 py-3">
          <h3 className="font-display glow-cyan text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
            ▓ UPCOMING FIXTURES
          </h3>
          <span className="text-[10px] tracking-widest text-muted-foreground">
            TIMES IN IST
          </span>
        </div>

        <ul>
          {signalFixtures.map((match) => {
            const home = teamMap.get(match.homeTeamId);
            const away = teamMap.get(match.awayTeamId);
            const scored = hasScore(match);
            // primary looks like "21:30 IST · 13/06/2026 (+1)"
            const [koTime, koDate] = (
              getAllTimezoneLines(match.localDate, match.stadiumId)?.primary ??
              ""
            ).split(" · ");

            return (
              <li
                key={match.id}
                className="flex items-center gap-2 border-b border-foreground/20 px-3 py-3 transition-colors last:border-0 hover:bg-muted sm:gap-4 sm:px-4"
              >
                <span className="font-display w-5 shrink-0 text-center text-[9px] text-teletext-amber sm:w-6">
                  {fixtureStageLabel(match.group)}
                </span>

                {/* Home */}
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
                  <span className="glow-soft truncate text-sm sm:text-base">
                    <span className="text-teletext-cyan">
                      {home?.fifaCode ?? "TBD"}
                    </span>{" "}
                    <span className="hidden text-muted-foreground sm:inline">
                      {home?.name}
                    </span>
                  </span>
                  {home?.flag && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={home.flag}
                      alt=""
                      className="h-4 w-6 shrink-0 border border-foreground/40 object-cover"
                    />
                  )}
                </div>

                {/* Score or kickoff (time + date) */}
                <div className="w-16 shrink-0 text-center leading-tight sm:w-20">
                  {scored ? (
                    <span
                      className={`font-display text-sm tabular-nums sm:text-base ${
                        match.state === "in"
                          ? "glow-green text-teletext-green"
                          : "glow-soft"
                      }`}
                    >
                      {match.homeScore}-{match.awayScore}
                    </span>
                  ) : (
                    <>
                      <span className="block text-[11px] text-teletext-yellow sm:text-xs">
                        {koTime || "v"}
                      </span>
                      {koDate && (
                        <span className="block text-[9px] tracking-wide text-muted-foreground">
                          {koDate}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Away */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {away?.flag && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={away.flag}
                      alt=""
                      className="h-4 w-6 shrink-0 border border-foreground/40 object-cover"
                    />
                  )}
                  <span className="glow-soft truncate text-sm sm:text-base">
                    <span className="text-teletext-cyan">
                      {away?.fifaCode ?? "TBD"}
                    </span>{" "}
                    <span className="hidden text-muted-foreground sm:inline">
                      {away?.name}
                    </span>
                  </span>
                </div>

                {/* Auto-width on mobile (no wasted space when empty); fixed
                    column on desktop so rows stay aligned. */}
                <div className="shrink-0 text-right empty:hidden sm:w-14">
                  <StatusBadge match={match} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
