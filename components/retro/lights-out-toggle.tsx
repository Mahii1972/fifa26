"use client";

import { Moon, Sun } from "lucide-react";
import { useLightsOut } from "@/lib/use-lights-out";

// Header control for the global lights-out theme. Lives in both the home and
// the live/[slug] headers; the actual theming is applied to <html> by
// <LightsOutSync> so it covers every page.
export function LightsOutToggle() {
  const { lightsOut, toggle } = useLightsOut();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={lightsOut}
      title={
        lightsOut
          ? "Lights-out: black screen (click for phosphor blue)"
          : "Phosphor blue (click to black out the screen)"
      }
      className="pixel-press flex items-center gap-1.5 border-2 border-foreground bg-secondary/40 px-2 py-1 text-teletext-cyan hover:bg-muted hover:text-teletext-yellow"
    >
      {lightsOut ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
      <span className="font-display hidden text-[7px] tracking-wide sm:inline">
        {lightsOut ? "LIGHT" : "DARK"}
      </span>
    </button>
  );
}
