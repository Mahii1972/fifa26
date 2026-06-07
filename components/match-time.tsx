"use client";

import { useState } from "react";
import { getAllTimezoneLines } from "@/lib/timezones";

export function MatchTimeRow({
  localDate,
  stadiumId,
  venue,
}: {
  localDate: string;
  stadiumId: string;
  venue?: string;
}) {
  const all = getAllTimezoneLines(localDate, stadiumId);
  const [showAll, setShowAll] = useState(false);

  if (!all) {
    return <span className="text-sm text-muted-foreground">{localDate}</span>;
  }

  return (
    <div>
      <p className="text-teletext-yellow">{all.primary}</p>
      {venue && (
        <p className="truncate text-xs text-muted-foreground">{venue}</p>
      )}
      <button
        type="button"
        onClick={() => setShowAll(!showAll)}
        className="mt-1 text-[10px] tracking-wider text-teletext-cyan hover:text-teletext-yellow"
      >
        {showAll ? "▲ HIDE ZONES" : "▼ ALL TIMEZONES"}
      </button>
      {showAll && (
        <div className="mt-1 space-y-0.5 border border-foreground/30 bg-muted/40 p-2 text-[10px]">
          {all.lines.map((line) => (
            <p
              key={line.tag}
              className={
                line.highlight ? "text-teletext-yellow" : "text-teletext-cyan"
              }
            >
              <span className="mr-2 inline-block w-6 font-display">
                {line.tag}
              </span>
              {line.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function MatchTimeCompact({
  localDate,
  stadiumId,
}: {
  localDate: string;
  stadiumId: string;
}) {
  const all = getAllTimezoneLines(localDate, stadiumId);
  if (!all) return <span>{localDate}</span>;
  return <span className="text-teletext-yellow">{all.primary}</span>;
}