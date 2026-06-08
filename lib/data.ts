import { readCsv, num, bool } from "./csv";
import { normalizeFlagUrl } from "./flags";
import type { Group, Match, SquadPlayer, Stadium, Team, WorldCupData } from "./types";

function loadTeams(): Team[] {
  return readCsv("worldcup2026.teams.csv").map((row) => ({
    id: row.id,
    name: row.name,
    flag: normalizeFlagUrl(row.flag),
    fifaCode: row.fifa_code,
    iso2: row.iso2,
    group: row.groups,
  }));
}

function loadGroups(): Group[] {
  return readCsv("worldcup2026.groups.csv").map((row) => ({
    name: row.name,
    standings: [0, 1, 2, 3].map((i) => ({
      teamId: row[`teams[${i}].team_id`],
      mp: num(row[`teams[${i}].mp`]),
      w: num(row[`teams[${i}].w`]),
      l: num(row[`teams[${i}].l`]),
      d: num(row[`teams[${i}].d`]),
      pts: num(row[`teams[${i}].pts`]),
      gf: num(row[`teams[${i}].gf`]),
      ga: num(row[`teams[${i}].ga`]),
      gd: num(row[`teams[${i}].gd`]),
    })),
  }));
}

function loadMatches(): Match[] {
  return readCsv("worldcup2026.games.csv").map((row) => ({
    id: row.id,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeScore: num(row.home_score),
    awayScore: num(row.away_score),
    group: row.group,
    matchday: num(row.matchday),
    localDate: row.local_date,
    stadiumId: row.stadium_id,
    finished: bool(row.finished),
    timeElapsed: row.time_elapsed,
    type: row.type,
  }));
}

function loadSquads(): SquadPlayer[] {
  return readCsv("worldcup2026.squads.csv").map((row) => ({
    id: row.id,
    teamId: row.team_id,
    shirtNumber: row.shirt_number,
    name: row.name,
    position: row.position,
    dateOfBirth: row.date_of_birth,
    age: num(row.age),
    caps: num(row.caps),
    goals: num(row.goals),
    club: row.club,
    coach: row.coach,
  }));
}

function loadStadiums(): Stadium[] {
  return readCsv("worldcup2026.stadia.csv").map((row) => ({
    id: row.id,
    name: row.name,
    fifaName: row.fifa_name,
    city: row.city,
    country: row.country,
    capacity: num(row.capacity),
    region: row.region,
  }));
}

export function getWorldCupData(): WorldCupData {
  return {
    teams: loadTeams(),
    groups: loadGroups(),
    matches: loadMatches(),
    stadiums: loadStadiums(),
    squads: loadSquads(),
  };
}

export function buildTeamMap(teams: Team[]): Map<string, Team> {
  return new Map(teams.map((t) => [t.id, t]));
}

export function buildStadiumMap(stadiums: Stadium[]): Map<string, Stadium> {
  return new Map(stadiums.map((s) => [s.id, s]));
}