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
              "pixel-press group relative flex min-w-0 flex-col items-center gap-1 border-r-2 border-foreground px-1 py-2.5 text-center last:border-r-0 sm:items-start sm:gap-1.5 sm:px-3 sm:py-3 sm:text-left",
              isActive
                ? "glow-soft bg-primary text-primary-foreground"
                : "bg-secondary/40 text-foreground hover:bg-muted hover:text-teletext-cyan",
            )}
          >
            <span className="hidden text-[10px] tracking-[0.2em] opacity-70 sm:inline sm:text-xs">
              {tab.num}
            </span>
            <span className="font-display flex items-center leading-none tracking-tight text-[7px] sm:text-[10px] sm:tracking-wide">
              {tab.label}
              {isActive && (
                <span className="ml-1 hidden animate-blink sm:inline-block">
                  █
                </span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
