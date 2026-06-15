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

export type TabId = "signal" | "live" | "groups" | "squads" | "fixtures" | "venues";

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

/** A featured live event (soccer) surfaced on the LIVE panel. */
export interface LiveEvent {
  url: string; // slug, used as /live/[slug]
  name: string;
  logo: string;
  time: string; // ISO-ish kickoff, e.g. "2026-06-11T15:00"
  featured: boolean;
  vip: boolean;
  streams: LiveStream[];
}