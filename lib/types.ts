export interface Team {
  id: string;
  name: string;
  flag: string;
  fifaCode: string;
  iso2: string;
  group: string;
}

export interface SquadPlayer {
  id: string;
  teamId: string;
  shirtNumber: string;
  name: string;
  position: string;
  dateOfBirth: string;
  age: number;
  caps: number;
  goals: number;
  club: string;
  coach: string;
}

export interface GroupStandingEntry {
  teamId: string;
  mp: number;
  w: number;
  l: number;
  d: number;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
}

export interface Group {
  name: string;
  standings: GroupStandingEntry[];
}

/** Lifecycle of a match. Mirrors ESPN status.type.state. */
export type MatchState = "pre" | "in" | "post";

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  group: string;
  matchday: number;
  localDate: string;
  stadiumId: string;
  finished: boolean;
  timeElapsed: string;
  type: string;
  /** Live-overlay fields (populated from ESPN when available). */
  state?: MatchState;
  /** Human status, e.g. "FT", "63'", "Thu, June 11th at 3:00 PM EDT". */
  statusDetail?: string;
  /** In-match clock, e.g. "63'". Only meaningful while state === "in". */
  displayClock?: string;
  /** Absolute kickoff in ISO UTC — from ESPN if matched, else derived from CSV. */
  kickoffUtc?: string;
  /** ESPN display fallback for knockout rows whose teams are still placeholders. */
  homeDisplayCode?: string;
  homeDisplayName?: string;
  awayDisplayCode?: string;
  awayDisplayName?: string;
  /** Where score/status came from for this match. */
  source?: "espn" | "csv";
}

export interface Stadium {
  id: string;
  name: string;
  fifaName: string;
  city: string;
  country: string;
  capacity: number;
  region: string;
}

export interface WorldCupData {
  teams: Team[];
  groups: Group[];
  matches: Match[];
  stadiums: Stadium[];
  squads: SquadPlayer[];
  /** ISO timestamp of the last successful data refresh. */
  lastUpdated?: string;
  /** True when scores/standings were overlaid from the live ESPN feed. */
  live?: boolean;
}

/** Volatile slice returned by /api/live and merged into the static base. */
export interface LiveOverlay {
  matches: Match[];
  groups: Group[];
  lastUpdated: string;
  live: boolean;
}

export type TabId = "signal" | "live" | "groups" | "squads" | "fixtures" | "watchparty";

/** A single playable feed for a live event/channel. */
export interface LiveStream {
  name: string;
  url: string;
  vip: boolean;
}

/** A single ephemeral chat message relayed through Pusher (never persisted). */
export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  ts: number; // epoch ms, stamped server-side on send
}

/**
 * Upstream sport/category taxonomy. The feed sends a numeric `genre`; this maps
 * each id to its display label. Note genre 1 is "Soccer" upstream but we surface
 * it as "Football" to match the rest of this site.
 */
export const GENRES: Record<number, string> = {
  1: "Football",
  2: "Motorsport",
  3: "MMA",
  4: "Full-Contact Combat",
  5: "Boxing",
  6: "Wrestling",
  7: "Basketball",
  8: "American Football",
  9: "Baseball",
  10: "Tennis",
  11: "Hockey",
  12: "Darts",
  13: "Cricket",
  14: "Cycling",
  15: "Rugby",
  16: "Live Shows",
  17: "Others",
};

/** Display label for a genre id, falling back to "Others" for unknown ids. */
export function genreLabel(genre: number): string {
  return GENRES[genre] ?? GENRES[17];
}

/**
 * An always-on 24/7 channel from the upstream channels feed. Note `genre` here
 * uses the channels taxonomy (Entertainment/Sports/Cartoons/News), which is
 * separate from the live-events GENRES map above.
 */
export interface Channel {
  url: string; // slug, used as /live/[slug]
  name: string;
  logo: string;
  genre: number;
  vip: boolean;
  streams: LiveStream[];
}

/** A live event/fixture surfaced on the LIVE panel. */
export interface LiveEvent {
  url: string; // slug, used as /live/[slug]
  name: string;
  logo: string;
  genre: number; // upstream sport/category id — see GENRES
  time: string; // ISO-ish kickoff, e.g. "2026-06-11T15:00"
  featured: boolean;
  vip: boolean;
  streams: LiveStream[];
}
