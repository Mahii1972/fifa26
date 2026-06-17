"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatOverlay } from "@/components/live/chat-overlay";
import type { LiveStream } from "@/lib/types";

// Fullscreen API with webkit (older Safari) fallbacks — not in the TS DOM lib.
type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

function fullscreenElement(): Element | null {
  const d = document as FsDocument;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}
function requestFullscreen(el: FsElement): Promise<void> | void {
  return (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
}
function exitFullscreen(): void {
  const d = document as FsDocument;
  (d.exitFullscreen ?? d.webkitExitFullscreen)?.call(d);
}

// Screen Orientation lock — lock/unlock aren't in the TS DOM lib, and lock only
// works while fullscreen on mobile (no-ops / rejects on desktop & iOS Safari).
type OrientationApi = {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};
function orientationApi(): OrientationApi | undefined {
  if (typeof screen === "undefined") return undefined;
  return screen.orientation as unknown as OrientationApi;
}
function lockLandscape(): Promise<void> | void {
  return orientationApi()?.lock?.("landscape");
}
function unlockOrientation(): void {
  try {
    orientationApi()?.unlock?.();
  } catch {
    /* unsupported — ignore */
  }
}

/**
 * Player with a source selector. Events expose several feeds (Tubi, FOX,
 * Telemundo…); the user picks one and we swap the iframe src. The embed
 * provider does anti-hotlink referrer checks, so we force a full referrer.
 *
 * Our own fullscreen button fullscreens the wrapper (iframe + chat overlay) so
 * messages can show over the video — the iframe's native fullscreen can't be
 * overlaid since it's cross-origin.
 */
export function StreamPlayer({
  streams,
  room,
}: {
  streams: LiveStream[];
  room?: string;
}) {
  const [active, setActive] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const current = streams[active];

  useEffect(() => {
    const onChange = () => {
      const fs = fullscreenElement() === stageRef.current;
      setIsFullscreen(fs);
      // Release the orientation lock once we leave fullscreen.
      if (!fs) unlockOrientation();
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  async function toggleFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    if (fullscreenElement()) {
      exitFullscreen();
      return;
    }
    try {
      const req = requestFullscreen(el);
      if (req && typeof req.then === "function") await req;
      // On mobile, force landscape so the stream isn't squeezed into portrait.
      try {
        await lockLandscape();
      } catch {
        /* desktop / iOS — orientation lock unsupported, ignore */
      }
    } catch {
      /* fullscreen denied (e.g. an embedded preview blocks it) — ignore */
    }
  }

  if (!current) {
    return (
      <div className="border-2 border-foreground bg-card/40 p-8 text-center text-sm tracking-wider text-teletext-amber">
        ░ NO FEED AVAILABLE FOR THIS EVENT
      </div>
    );
  }

  return (
    <section className="border-2 border-foreground">
      <div className="font-display glow-cyan flex items-center justify-between gap-2 border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
        <span className="min-w-0 truncate">
          ▓ NOW PLAYING · {current.name.toUpperCase()}
        </span>
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-teletext-green">
          <span className="inline-block h-2.5 w-2.5 shrink-0 animate-blink bg-teletext-green" />
          ON AIR
        </span>
      </div>

      <div
        ref={stageRef}
        className={cn(
          "relative w-full bg-black",
          isFullscreen ? "h-screen" : "aspect-video",
        )}
      >
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

        {/* Sits over the embedded player's own fullscreen button (bottom-right)
            so tapping there triggers our overlay-capable fullscreen instead. */}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Toggle fullscreen"
          title={
            isFullscreen ? "Exit fullscreen" : "Fullscreen with chat overlay"
          }
          className="absolute right-1.5 bottom-1.5 z-20 border border-white/30 bg-black/70 p-2 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/90"
        >
          {isFullscreen ? (
            <Minimize className="h-5 w-5" />
          ) : (
            <Maximize className="h-5 w-5" />
          )}
        </button>

        {isFullscreen && room && <ChatOverlay room={room} />}
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
