import type { Match } from "@/lib/types";

export function isLive(m: Match): boolean {
  return m.state === "in";
}

export function isFinished(m: Match): boolean {
  return m.state === "post" || m.finished;
}

export function hasScore(m: Match): boolean {
  return isLive(m) || isFinished(m) || m.homeScore > 0 || m.awayScore > 0;
}

/**
 * Compact live-status chip: blinking clock while in-play, "FT" when finished,
 * nothing for not-yet-started matches (their kickoff time is shown elsewhere).
 */
export function StatusBadge({ match }: { match: Match }) {
  if (isLive(match)) {
    return (
      <span className="font-display glow-green animate-blink inline-block border border-teletext-green px-1.5 py-0.5 text-[8px] tracking-widest text-teletext-green">
        ● {match.displayClock || "LIVE"}
      </span>
    );
  }
  if (isFinished(match)) {
    return (
      <span className="font-display inline-block border border-foreground/40 px-1.5 py-0.5 text-[8px] tracking-widest text-muted-foreground">
        FT
      </span>
    );
  }
  return null;
}
