export interface Team {
  id: string;
  name: string;
  flag: string;
  fifaCode: string;
  iso2: string;
  group: string;
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
}

export type TabId = "signal" | "groups" | "squads" | "fixtures" | "venues";