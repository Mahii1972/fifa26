"use client";

import { cn } from "@/lib/utils";
import type { TabId } from "@/lib/types";

const TABS: { id: TabId; num: string; label: string }[] = [
  { id: "signal", num: "P100", label: "SIGNAL" },
  { id: "groups", num: "P200", label: "GROUPS" },
  { id: "squads", num: "P300", label: "SQUADS" },
  { id: "fixtures", num: "P400", label: "FIXTURES" },
  { id: "venues", num: "P500", label: "VENUES" },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <nav className="grid grid-cols-5 border-b-2 border-foreground">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "pixel-press group relative flex flex-col items-start gap-1.5 border-r-2 border-foreground px-2 py-3 text-left last:border-r-0 sm:px-3",
              isActive
                ? "glow-soft bg-primary text-primary-foreground"
                : "bg-secondary/40 text-foreground hover:bg-muted hover:text-teletext-cyan",
            )}
          >
            <span className="text-[10px] tracking-[0.2em] opacity-70 sm:text-xs">
              {tab.num}
            </span>
            <span className="font-display flex items-center text-[8px] tracking-wide sm:text-[10px]">
              {tab.label}
              {isActive && (
                <span className="ml-1 inline-block animate-blink">█</span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
