/** June 2026 DST offsets in minutes from UTC (per FIFA schedule). */
export const STADIUM_OFFSETS: Record<
  string,
  { minutes: number; label: string; short: string }
> = {
  "1": { minutes: -360, label: "UTC-6", short: "MEX" },
  "2": { minutes: -360, label: "UTC-6", short: "MEX" },
  "3": { minutes: -360, label: "UTC-6", short: "MEX" },
  "4": { minutes: -300, label: "UTC-5", short: "CT" },
  "5": { minutes: -300, label: "UTC-5", short: "CT" },
  "6": { minutes: -300, label: "UTC-5", short: "CT" },
  "7": { minutes: -240, label: "UTC-4", short: "ET" },
  "8": { minutes: -240, label: "UTC-4", short: "ET" },
  "9": { minutes: -240, label: "UTC-4", short: "ET" },
  "10": { minutes: -240, label: "UTC-4", short: "ET" },
  "11": { minutes: -240, label: "UTC-4", short: "ET" },
  "12": { minutes: -240, label: "UTC-4", short: "ET" },
  "13": { minutes: -420, label: "UTC-7", short: "PT" },
  "14": { minutes: -420, label: "UTC-7", short: "PT" },
  "15": { minutes: -420, label: "UTC-7", short: "PT" },
  "16": { minutes: -420, label: "UTC-7", short: "PT" },
};

export const IST_OFFSET = 330; // UTC+5:30

export type DisplayTimezone = "IST" | "LOCAL" | "UTC" | "ET" | "PT";

export const TIMEZONE_OPTIONS: {
  id: DisplayTimezone;
  label: string;
  minutes: number | "local";
}[] = [
  { id: "IST", label: "IST (UTC+5:30)", minutes: IST_OFFSET },
  { id: "LOCAL", label: "VENUE LOCAL", minutes: "local" },
  { id: "UTC", label: "UTC", minutes: 0 },
  { id: "ET", label: "ET (UTC-4)", minutes: -240 },
  { id: "PT", label: "PT (UTC-7)", minutes: -420 },
];

export interface ParsedKickoff {
  utcMs: number;
  localTime: string;
  localDate: string;
  localLabel: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parse `06/11/2026 13:00` as venue-local kickoff. */
export function parseKickoff(
  localDate: string,
  stadiumId: string,
): ParsedKickoff | null {
  const match = localDate.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/,
  );
  if (!match) return null;

  const [, mm, dd, yyyy, hh, min] = match;
  const offset = STADIUM_OFFSETS[stadiumId]?.minutes ?? -300;
  const localMs = Date.UTC(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
  );
  const utcMs = localMs - offset * 60_000;

  return {
    utcMs,
    localTime: `${hh}:${min}`,
    localDate: `${dd}/${mm}/${yyyy}`,
    localLabel: STADIUM_OFFSETS[stadiumId]?.label ?? "UTC-5",
  };
}

export function formatKickoff(
  kickoff: ParsedKickoff,
  offsetMinutes: number,
): { time: string; date: string; dayShift: number } {
  const shifted = new Date(kickoff.utcMs + offsetMinutes * 60_000);
  const utc = new Date(kickoff.utcMs);
  const dayShift = shifted.getUTCDate() - utc.getUTCDate();

  return {
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
    date: `${pad(shifted.getUTCDate())}/${pad(shifted.getUTCMonth() + 1)}/${shifted.getUTCFullYear()}`,
    dayShift,
  };
}

export function getAllTimezoneLines(
  localDate: string,
  stadiumId: string,
): { primary: string; lines: { tag: string; text: string; highlight?: boolean }[] } | null {
  const kickoff = parseKickoff(localDate, stadiumId);
  if (!kickoff) {
    return { primary: localDate, lines: [{ tag: "RAW", text: localDate }] };
  }

  const ist = formatKickoff(kickoff, IST_OFFSET);
  const utc = formatKickoff(kickoff, 0);
  const localOffset = STADIUM_OFFSETS[stadiumId]?.minutes ?? -300;
  const local = formatKickoff(kickoff, localOffset);

  const daySuffix = (n: number) =>
    n > 0 ? " (+1)" : n < 0 ? " (-1)" : "";

  const lines = [
    {
      tag: "IST",
      text: `${ist.time} · ${ist.date}${daySuffix(ist.dayShift)}`,
      highlight: true,
    },
    {
      tag: "LOC",
      text: `${kickoff.localTime} ${kickoff.localLabel} · ${kickoff.localDate}`,
    },
    {
      tag: "UTC",
      text: `${utc.time} · ${utc.date}${daySuffix(utc.dayShift)}`,
    },
    {
      tag: "ET",
      text: `${formatKickoff(kickoff, -240).time} · ${formatKickoff(kickoff, -240).date}${daySuffix(formatKickoff(kickoff, -240).dayShift)}`,
    },
    {
      tag: "PT",
      text: `${formatKickoff(kickoff, -420).time} · ${formatKickoff(kickoff, -420).date}${daySuffix(formatKickoff(kickoff, -420).dayShift)}`,
    },
  ];

  return {
    primary: `${ist.time} IST · ${ist.date}${daySuffix(ist.dayShift)}`,
    lines,
  };
}

export function formatForTimezone(
  localDate: string,
  stadiumId: string,
  tz: DisplayTimezone,
): string {
  const kickoff = parseKickoff(localDate, stadiumId);
  if (!kickoff) return localDate;

  if (tz === "LOCAL") {
    return `${kickoff.localTime} ${kickoff.localLabel} · ${kickoff.localDate}`;
  }

  const opt = TIMEZONE_OPTIONS.find((o) => o.id === tz);
  const minutes =
    opt?.minutes === "local"
      ? (STADIUM_OFFSETS[stadiumId]?.minutes ?? -300)
      : (opt?.minutes ?? IST_OFFSET);

  const f = formatKickoff(kickoff, minutes);
  const suffix = f.dayShift > 0 ? " (+1)" : f.dayShift < 0 ? " (-1)" : "";

  return `${f.time} ${tz} · ${f.date}${suffix}`;
}