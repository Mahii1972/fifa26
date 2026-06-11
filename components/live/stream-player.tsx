"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { LiveStream } from "@/lib/types";

/**
 * Player with a source selector. Events expose several feeds (Tubi, FOX,
 * Telemundo…); the user picks one and we swap the iframe src. The embed
 * provider does anti-hotlink referrer checks, so we force a full referrer.
 */
export function StreamPlayer({ streams }: { streams: LiveStream[] }) {
  const [active, setActive] = useState(0);
  const current = streams[active];

  if (!current) {
    return (
      <div className="border-2 border-foreground bg-card/40 p-8 text-center text-sm tracking-wider text-teletext-amber">
        ░ NO FEED AVAILABLE FOR THIS EVENT
      </div>
    );
  }

  return (
    <section className="border-2 border-foreground">
      <div className="font-display glow-cyan flex items-center justify-between border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
        <span>▓ NOW PLAYING · {current.name.toUpperCase()}</span>
        <span className="flex items-center gap-2 text-teletext-green">
          <span className="inline-block h-2.5 w-2.5 animate-blink bg-teletext-green" />
          ON AIR
        </span>
      </div>

      <div className="relative aspect-video w-full bg-black">
        <iframe
          key={current.url}
          src={current.url}
          className="absolute inset-0 h-full w-full"
          frameBorder="0"
          scrolling="no"
          referrerPolicy="unsafe-url"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title={current.name}
        />
      </div>

      {streams.length > 1 && (
        <div className="border-t-2 border-foreground bg-card/40 p-4">
          <p className="mb-3 text-[11px] tracking-[0.3em] text-teletext-amber">
            ▌SELECT FEED · {streams.length} SOURCES
          </p>
          <div className="flex flex-wrap gap-1.5">
            {streams.map((s, i) => (
              <button
                key={s.url}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "pixel-press font-display border-2 px-2.5 py-1.5 text-[8px] tracking-wider",
                  i === active
                    ? "pixel-shadow-sm border-teletext-yellow bg-teletext-yellow text-background"
                    : "border-teletext-cyan/40 text-teletext-cyan hover:border-teletext-yellow hover:text-teletext-yellow",
                )}
              >
                {s.name}
                {s.vip ? " ★" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="border-t-2 border-foreground bg-card/40 px-4 py-3 text-xs tracking-wider text-muted-foreground">
        THIRD-PARTY SOURCE · CONTAINS ADS — USE UBLOCK ORIGIN OR A BROWSER LIKE
        BRAVE FOR AN AD-FREE EXPERIENCE
      </p>
    </section>
  );
}
