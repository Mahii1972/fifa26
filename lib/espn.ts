/**
 * ESPN live-data adapter for FIFA World Cup 2026.
 *
 * The app's source of truth is the bundled CSV snapshot (lib/data.ts). This
 * module overlays *live* scores and standings from ESPN's public, unofficial
 * API on top of that snapshot. The join key is the team's FIFA code
 * (CSV `fifa_code` === ESPN `team.abbreviation`) — verified to match 1:1 for
 * all 48 nations.
 *
 * Everything here is best-effort: any network/parse failure leaves the CSV
 * data untouched (see lib/live-data.ts), so the dashboard never goes blank.
 */

const SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const STANDINGS =
  "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";

/** Full tournament window (group stage through final). */
const TOURNAMENT_RANGE = "20260611-20260719";

/** Shape of the bits we read from a scoreboard event. */
export interface EspnMatch {
  homeCode: string;
  homeDisplayCode: string;
  homeDisplayName: string;
  awayCode: string;
  awayDisplayCode: string;
  awayDisplayName: string;
  homeScore: number;
  awayScore: number;
  state: "pre" | "in" | "post";
  statusDetail: string;
  displayClock: string;
  kickoffUtc: string;
}

/** Standings stats for one team, keyed later by FIFA code. */
export interface EspnStanding {
  code: string;
  mp: number;
  w: number;
  l: number;
  d: number;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
}

interface FetchOpts {
  /** Server-component cache lifetime in seconds. Omit for always-fresh. */
  revalidate?: number;
}

async function getJson(url: string, opts: FetchOpts): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      // A revalidate window caches the page render; route handlers pass none
      // (no-store) so client polling always sees the freshest scores.
      ...(opts.revalidate != null
        ? { next: { revalidate: opts.revalidate } }
        : { cache: "no-store" as const }),
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeState(state: unknown): "pre" | "in" | "post" {
  return state === "in" || state === "post" ? state : "pre";
}

function displayCode(team: any): string {
  return team?.isActive === false
    ? (team?.shortDisplayName ?? team?.abbreviation ?? "")
    : (team?.abbreviation ?? team?.shortDisplayName ?? "");
}

function displayName(team: any): string {
  return team?.displayName ?? team?.name ?? team?.abbreviation ?? "";
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function fetchEspnMatches(opts: FetchOpts = {}): Promise<EspnMatch[]> {
  const data = (await getJson(
    `${SCOREBOARD}?dates=${TOURNAMENT_RANGE}`,
    opts,
  )) as any;
  const events = data?.events;
  if (!Array.isArray(events)) return [];

  const out: EspnMatch[] = [];
  for (const event of events) {
    const comp = event?.competitions?.[0];
    const competitors = comp?.competitors;
    if (!Array.isArray(competitors)) continue;

    const home = competitors.find((c: any) => c?.homeAway === "home");
    const away = competitors.find((c: any) => c?.homeAway === "away");
    const homeCode = home?.team?.abbreviation;
    const awayCode = away?.team?.abbreviation;
    if (!homeCode || !awayCode) continue;

    const type = comp?.status?.type ?? {};
    out.push({
      homeCode,
      homeDisplayCode: displayCode(home?.team),
      homeDisplayName: displayName(home?.team),
      awayCode,
      awayDisplayCode: displayCode(away?.team),
      awayDisplayName: displayName(away?.team),
      homeScore: num(home?.score),
      awayScore: num(away?.score),
      state: normalizeState(type?.state),
      statusDetail: type?.shortDetail ?? type?.detail ?? "",
      displayClock: comp?.status?.displayClock ?? "",
      kickoffUtc: comp?.date ?? event?.date ?? "",
    });
  }
  return out;
}

export async function fetchEspnStandings(
  opts: FetchOpts = {},
): Promise<Map<string, EspnStanding[]>> {
  const data = (await getJson(STANDINGS, opts)) as any;
  const groups = data?.children;
  const byGroup = new Map<string, EspnStanding[]>();
  if (!Array.isArray(groups)) return byGroup;

  for (const group of groups) {
    // "Group A" -> "A"
    const letter = String(group?.name ?? "").split(" ").pop() ?? "";
    const entries = group?.standings?.entries;
    if (!letter || !Array.isArray(entries)) continue;

    const rows: EspnStanding[] = [];
    for (const entry of entries) {
      const code = entry?.team?.abbreviation;
      if (!code) continue;
      const stat = (name: string) =>
        num(entry?.stats?.find((s: any) => s?.name === name)?.value);
      rows.push({
        code,
        mp: stat("gamesPlayed"),
        w: stat("wins"),
        l: stat("losses"),
        d: stat("ties"),
        pts: stat("points"),
        gf: stat("pointsFor"),
        ga: stat("pointsAgainst"),
        gd: stat("pointDifferential"),
      });
    }
    byGroup.set(letter, rows);
  }
  return byGroup;
}
