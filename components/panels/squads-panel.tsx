"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "radix-ui";
import { MatchTimeCompact } from "@/components/match-time";
import { FILTER_ACTIVE, FILTER_INACTIVE } from "@/lib/teletext";
import type { Match, SquadPlayer, Team, WorldCupData } from "@/lib/types";

const POSITION_ORDER = ["GK", "DF", "MF", "FW"] as const;

// Abbreviation in the table, full word in the filter chips.
const POSITION_FILTERS = [
  { value: "ALL", label: "ALL" },
  { value: "GK", label: "GOALKEEPER" },
  { value: "DF", label: "DEFENDER" },
  { value: "MF", label: "MIDFIELDER" },
  { value: "FW", label: "FORWARD" },
] as const;

type TeamFixture = { match: Match; isHome: boolean; opponent?: Team };

function sortPlayers(players: SquadPlayer[]) {
  return [...players].sort((a, b) => {
    const pos =
      POSITION_ORDER.indexOf(a.position as (typeof POSITION_ORDER)[number]) -
      POSITION_ORDER.indexOf(b.position as (typeof POSITION_ORDER)[number]);
    if (pos !== 0) return pos;
    return Number(a.shirtNumber) - Number(b.shirtNumber);
  });
}

export function SquadsPanel({ data }: { data: WorldCupData }) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [isMobile, setIsMobile] = useState(false);

  const teamMap = useMemo(
    () => new Map(data.teams.map((t) => [t.id, t])),
    [data.teams],
  );

  const squadsByTeam = useMemo(() => {
    const map = new Map<string, SquadPlayer[]>();
    for (const player of data.squads) {
      const list = map.get(player.teamId) ?? [];
      list.push(player);
      map.set(player.teamId, list);
    }
    return map;
  }, [data.squads]);

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
        team.fifaCode.toLowerCase().includes(q) ||
        (squadsByTeam.get(team.id) ?? []).some(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.club.toLowerCase().includes(q),
        );
      return matchesGroup && matchesQuery;
    });
  }, [data.teams, query, groupFilter, squadsByTeam]);

  const selectedTeam = data.teams.find((t) => t.id === selectedTeamId) ?? null;
  const fullSquad = selectedTeam
    ? sortPlayers(squadsByTeam.get(selectedTeam.id) ?? [])
    : [];
  const coach = fullSquad[0]?.coach ?? "";
  const selectedSquad =
    positionFilter === "ALL"
      ? fullSquad
      : fullSquad.filter((p) => p.position === positionFilter);

  const selectedFixtures: TeamFixture[] = useMemo(() => {
    if (!selectedTeam) return [];
    return data.matches
      .filter(
        (m) =>
          m.homeTeamId === selectedTeam.id || m.awayTeamId === selectedTeam.id,
      )
      .sort((a, b) => a.matchday - b.matchday || Number(a.id) - Number(b.id))
      .map((match) => {
        const isHome = match.homeTeamId === selectedTeam.id;
        return {
          match,
          isHome,
          opponent: teamMap.get(isHome ? match.awayTeamId : match.homeTeamId),
        };
      });
  }, [selectedTeam, data.matches, teamMap]);

  // Reset the position filter so each nation opens on its full squad.
  useEffect(() => {
    setPositionFilter("ALL");
  }, [selectedTeamId]);

  // Below lg the detail opens in a dialog; at lg+ it lives in the side panel.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const detailContent = selectedTeam ? (
    <SquadDetail
      team={selectedTeam}
      players={selectedSquad}
      coach={coach}
      fixtures={selectedFixtures}
      positionFilter={positionFilter}
      onPositionChange={setPositionFilter}
    />
  ) : null;

  return (
    <div>
      <header className="pixel-shadow mb-6 border-2 border-foreground bg-secondary/40 p-5">
        <p className="text-xs tracking-[0.3em] text-teletext-cyan">
          ▌TRANSMISSION 003 / NATIONAL SQUADS
        </p>
        <h2 className="font-display glow-yellow mt-3 text-base tracking-tight text-teletext-yellow sm:text-lg">
          {data.teams.length} QUALIFIED NATIONS · {data.squads.length} PLAYERS
        </h2>
      </header>

      <div className="mb-4 flex flex-col gap-3 border-2 border-foreground bg-card/40 p-3 sm:flex-row sm:items-center">
        <span className="font-display animate-blink shrink-0 text-[10px] text-teletext-green">
          &gt;
        </span>
        <input
          type="text"
          placeholder="SEARCH TEAM, PLAYER, OR CLUB..."
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid gap-0 border-2 border-foreground sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {filtered.map((team, i) => (
            <TeamRow
              key={team.id}
              team={team}
              index={i}
              playerCount={squadsByTeam.get(team.id)?.length ?? 0}
              selected={selectedTeamId === team.id}
              onSelect={() =>
                setSelectedTeamId((current) =>
                  current === team.id ? null : team.id,
                )
              }
            />
          ))}
        </div>

        {/* Desktop (lg+): detail lives in the side panel. */}
        <div className="hidden border-2 border-foreground bg-card/30 lg:block">
          {!isMobile && detailContent ? (
            detailContent
          ) : (
            <div className="flex min-h-64 items-center justify-center p-8 text-center">
              <p className="glow-soft text-sm tracking-widest text-muted-foreground">
                SELECT A NATION TO VIEW FULL SQUAD ROSTER
              </p>
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="glow-magenta mt-4 text-base text-teletext-magenta">
          ⚠ NO SQUADS MATCH FILTER.
        </p>
      )}

      {/* Mobile (<lg): detail opens in a modal terminal window. */}
      <Dialog.Root
        open={isMobile && selectedTeam !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTeamId(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-[1px]" />
          <Dialog.Content
            aria-describedby={undefined}
            className="pixel-shadow fixed left-1/2 top-1/2 z-[61] flex max-h-[92vh] w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col border-2 border-foreground bg-card shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b-2 border-foreground bg-secondary/60 px-3 py-2">
              <Dialog.Title className="font-display glow-yellow text-[9px] tracking-widest text-teletext-yellow">
                ■ SQUAD ROSTER
              </Dialog.Title>
              <Dialog.Close
                aria-label="Close"
                className="font-display pixel-press border-2 border-foreground bg-teletext-red px-2 py-1 text-[9px] tracking-widest text-foreground"
              >
                X
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{detailContent}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function TeamRow({
  team,
  index,
  playerCount,
  selected,
  onSelect,
}: {
  team: Team;
  index: number;
  playerCount: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-r border-foreground/30 p-3 text-left transition-colors hover:bg-muted ${
        selected ? "bg-muted" : ""
      }`}
    >
      <span className="w-6 text-xs text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
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
          {team.fifaCode} · GRP {team.group} · {playerCount} PLAYERS
        </p>
      </div>
    </button>
  );
}

function SquadDetail({
  team,
  players,
  coach,
  fixtures,
  positionFilter,
  onPositionChange,
}: {
  team: Team;
  players: SquadPlayer[];
  coach: string;
  fixtures: TeamFixture[];
  positionFilter: string;
  onPositionChange: (value: string) => void;
}) {
  return (
    <div>
      <header className="border-b border-foreground/30 p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-14 shrink-0 overflow-hidden border border-foreground/40 bg-muted">
            {team.flag ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.flag}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div>
            <h3 className="glow-yellow text-lg tracking-wide text-teletext-yellow">
              {team.name}
            </h3>
            <p className="font-display mt-1 text-[8px] tracking-widest text-teletext-cyan">
              {team.fifaCode} · GROUP {team.group}
              {coach ? ` · COACH ${coach.toUpperCase()}` : ""}
            </p>
          </div>
        </div>
      </header>

      {fixtures.length > 0 && (
        <section className="border-b border-foreground/30 p-4">
          <h4 className="font-display glow-cyan mb-3 text-[9px] tracking-widest text-teletext-cyan">
            ▓ GROUP {team.group} FIXTURES
          </h4>
          <div className="space-y-0 text-sm sm:text-base">
            {fixtures.map(({ match, isHome, opponent }) => {
              const played =
                match.finished ||
                match.homeScore > 0 ||
                match.awayScore > 0;
              const score = `${match.homeScore}-${match.awayScore}`;
              return (
                <div
                  key={match.id}
                  className="flex items-center gap-2 border-b border-foreground/10 py-2 last:border-0 sm:gap-3"
                >
                  <span className="font-display w-9 shrink-0 text-[8px] text-teletext-amber">
                    MD{match.matchday}
                  </span>
                  <span
                    className={`w-5 shrink-0 text-center text-xs ${
                      isHome ? "text-teletext-green" : "text-teletext-magenta"
                    }`}
                    title={isHome ? "Home" : "Away"}
                  >
                    {isHome ? "H" : "A"}
                  </span>
                  <span className="glow-soft min-w-0 flex-1 truncate">
                    <span className="mr-1 text-muted-foreground">
                      {isHome ? "v" : "@"}
                    </span>
                    <span className="text-teletext-cyan">
                      {opponent?.fifaCode ?? "TBD"}
                    </span>
                    <span className="ml-2 hidden text-muted-foreground sm:inline">
                      {opponent?.name}
                    </span>
                  </span>
                  {played ? (
                    <span className="font-display glow-green shrink-0 text-[10px] text-teletext-green">
                      {score}
                    </span>
                  ) : (
                    <span className="shrink-0 text-right text-teletext-yellow">
                      <MatchTimeCompact
                        localDate={match.localDate}
                        stadiumId={match.stadiumId}
                      />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-1.5 border-b border-foreground/30 p-3 sm:flex sm:flex-wrap sm:items-center">
        {POSITION_FILTERS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onPositionChange(p.value)}
            className={`${
              positionFilter === p.value ? FILTER_ACTIVE : FILTER_INACTIVE
            } text-center ${p.value === "ALL" ? "col-span-2 sm:col-auto" : ""}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto lg:max-h-[32rem] lg:overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-foreground/30 font-display text-[8px] tracking-widest text-teletext-cyan">
              <th className="px-2 py-2 sm:px-3">POS</th>
              <th className="px-2 py-2 sm:px-3">PLAYER</th>
              <th className="hidden px-3 py-2 sm:table-cell">AGE</th>
              <th className="hidden px-3 py-2 md:table-cell">CLUB</th>
              <th className="px-2 py-2 text-right sm:px-3">CAPS</th>
              <th className="px-2 py-2 text-right sm:px-3">G</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr
                key={player.id}
                className="border-b border-foreground/10 hover:bg-muted/50"
              >
                <td className="px-2 py-2 font-display text-[10px] text-teletext-green sm:px-3">
                  {player.position}
                </td>
                <td className="px-2 py-2 sm:px-3">
                  <p className="glow-soft text-base leading-tight">
                    {player.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground md:hidden">
                    {player.club}
                  </p>
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                  {player.age || "—"}
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">
                  {player.club}
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground sm:px-3">
                  {player.caps}
                </td>
                <td className="px-2 py-2 text-right text-teletext-yellow sm:px-3">
                  {player.goals}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}