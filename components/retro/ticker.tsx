"use client";

import type { WorldCupData } from "@/lib/types";

export function Ticker({ data }: { data: WorldCupData }) {
  const hosts = ["USA", "MEX", "CAN"];
  const openDate = data.matches[0]?.localDate ?? "06/11/2026";
  const items = [
    `WC26 BROADCAST`,
    `${data.teams.length} NATIONS`,
    `${data.matches.length} FIXTURES`,
    `${data.stadiums.length} VENUES`,
    `HOSTS: ${hosts.join(" · ")}`,
    `KICKOFF ${openDate}`,
    `48-TEAM FORMAT`,
    `GROUPS A–L`,
  ];

  const text = items.join(" ◆ ") + " ◆ ";

  return (
    <div className="ticker-wrap relative flex items-center border-b-2">
      <span className="font-display z-10 shrink-0 self-stretch bg-teletext-yellow px-2 py-1.5 text-[8px] tracking-wider text-teletext-red sm:text-[9px]">
        ◀ WIRE
      </span>
      <div className="ticker-track text-sm tracking-widest uppercase">
        <span>{text}</span>
        <span aria-hidden>{text}</span>
      </div>
    </div>
  );
}