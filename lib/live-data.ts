/**
 * Server-side merge: overlay ESPN live scores/standings onto the CSV base.
 *
 * `getLiveOverlay` is the single source for the volatile slice of data
 * (matches + groups). Both the initial server render (app/page.tsx) and the
 * client poll endpoint (app/api/live) call it, so the merge logic lives in one
 * place. Any ESPN failure degrades gracefully to the CSV snapshot.
 */
import { getWorldCupData } from "./data";
import { fetchEspnMatches, fetchEspnStandings } from "./espn";
import { parseKickoff } from "./timezones";
import type {
  Group,
  GroupStandingEntry,
  LiveOverlay,
  Match,
  Team,
  WorldCupData,
} from "./types";

function teamByCode(teams: Team[]): Map<string, Team> {
  return new Map(teams.map((t) => [t.fifaCode, t]));
}

/** Best-effort absolute kickoff from the CSV venue-local string. */
function csvKickoffUtc(match: Match): string | undefined {
  const parsed = parseKickoff(match.localDate, match.stadiumId);
  return parsed ? new Date(parsed.utcMs).toISOString() : undefined;
}

function overlayMatches(base: WorldCupData, espn: Awaited<ReturnType<typeof fetchEspnMatches>>): Match[] {
  const codeOf = (id: string) =>
    base.teams.find((t) => t.id === id)?.fifaCode;

  // Index ESPN matches by "HOME-AWAY" fifa-code pair (orientation-sensitive).
  const espnByPair = new Map(espn.map((m) => [`${m.homeCode}-${m.awayCode}`, m]));

  return base.matches.map((match) => {
    const homeCode = codeOf(match.homeTeamId);
    const awayCode = codeOf(match.awayTeamId);
    const live = homeCode && awayCode
      ? espnByPair.get(`${homeCode}-${awayCode}`)
      : undefined;

    if (!live) {
      // No ESPN match — keep CSV values, still expose a derived kickoff.
      return { ...match, kickoffUtc: csvKickoffUtc(match), source: "csv" as const };
    }

    return {
      ...match,
      homeScore: live.homeScore,
      awayScore: live.awayScore,
      finished: live.state === "post",
      state: live.state,
      statusDetail: live.statusDetail,
      displayClock: live.displayClock,
      kickoffUtc: live.kickoffUtc || csvKickoffUtc(match),
      source: "espn" as const,
    };
  });
}

/** Fetch ESPN and merge onto the static base. Never throws. */
export async function getLiveOverlay(
  base: WorldCupData,
  revalidate?: number,
): Promise<LiveOverlay> {
  const opts = revalidate != null ? { revalidate } : {};
  const [espnMatches, espnStandings] = await Promise.all([
    fetchEspnMatches(opts),
    fetchEspnStandings(opts),
  ]);

  const live = espnMatches.length > 0 || espnStandings.size > 0;
  const matches = overlayMatches(base, espnMatches);

  const codeMap = teamByCode(base.teams);
  const groups: Group[] = base.groups.map((group) => {
    const rows = espnStandings.get(group.name);
    if (!rows || rows.length === 0) return group;

    // Re-key ESPN standings by teamId so we can rebuild ordered entries.
    const byTeamId = new Map<string, GroupStandingEntry>();
    for (const r of rows) {
      const team = codeMap.get(r.code);
      if (!team) continue;
      byTeamId.set(team.id, {
        teamId: team.id,
        mp: r.mp, w: r.w, l: r.l, d: r.d,
        pts: r.pts, gf: r.gf, ga: r.ga, gd: r.gd,
      });
    }

    const standings = group.standings.map(
      (entry) => byTeamId.get(entry.teamId) ?? entry,
    );
    // Sort by pts, then GD, then GF (standard tiebreakers).
    standings.sort(
      (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf,
    );
    return { ...group, standings };
  });

  return {
    matches,
    groups,
    lastUpdated: new Date().toISOString(),
    live,
  };
}

/** Full merged dataset for the initial server render. */
export async function getLiveWorldCupData(
  revalidate = 30,
): Promise<WorldCupData> {
  const base = getWorldCupData();
  const overlay = await getLiveOverlay(base, revalidate);
  return {
    ...base,
    matches: overlay.matches,
    groups: overlay.groups,
    lastUpdated: overlay.lastUpdated,
    live: overlay.live,
  };
}
