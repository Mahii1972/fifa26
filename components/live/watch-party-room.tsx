"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StreamPlayer } from "@/components/live/stream-player";
import { ChatPanel } from "@/components/live/chat-panel";
import { LightsOutToggle } from "@/components/retro/lights-out-toggle";
import { cn } from "@/lib/utils";
import type { LiveStream } from "@/lib/types";

/**
 * The interactive shell of a watch-party room: header (with a guarded BACK), the
 * player + chat grid, and the party lifecycle. Presence (who's here) comes from
 * ChatPanel's roster — a single Pusher subscription, so the count stays honest.
 *
 * A party lives as long as ≥1 person is present. When you're the last one,
 * leaving is confirmed (in-app modal for BACK, native prompt for tab-close),
 * since leaving empties the room and ends the party.
 */
export function WatchPartyRoom({
  slug,
  title,
  streams,
}: {
  slug: string;
  title: string;
  streams: LiveStream[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const count = members.length;
  // You're the last one only once you've actually joined (picked a chat handle →
  // 1 presence member). count 0 = not joined yet, nothing to end.
  const isLast = count === 1;

  // Warn before a tab-close that would end the party.
  useEffect(() => {
    if (!isLast) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isLast]);

  function handleBack() {
    if (isLast) setConfirmOpen(true);
    else router.push("/");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b-2 border-foreground px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={handleBack}
          className="font-display pixel-press text-[10px] tracking-wider text-teletext-cyan hover:text-teletext-yellow"
        >
          ◄ BACK
        </button>
        <div className="flex items-center gap-3 sm:gap-4">
          {count > 0 && (
            <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] tracking-widest text-teletext-green">
              <span className="inline-block h-2 w-2 animate-blink bg-teletext-green" />
              {count} WATCHING
            </span>
          )}
          <span className="glow-cyan hidden text-[11px] tracking-[0.3em] text-teletext-cyan sm:inline">
            WATCH PARTY
          </span>
          <LightsOutToggle />
        </div>
      </header>

      <main className="p-3 sm:p-4 md:p-6">
        <header className="pixel-shadow mb-6 border-2 border-foreground bg-secondary/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs tracking-[0.3em] text-teletext-cyan">
                ▌WATCH PARTY
              </p>
              <h1 className="font-display glow-yellow mt-3 text-base tracking-tight text-teletext-yellow sm:text-lg">
                {title.toUpperCase()}
              </h1>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="pixel-press font-display shrink-0 border-2 border-teletext-cyan/50 px-3 py-1.5 text-[8px] tracking-wider text-teletext-cyan hover:border-teletext-yellow hover:text-teletext-yellow"
            >
              {copied ? "✓ COPIED" : "⎘ COPY INVITE LINK"}
            </button>
          </div>
          <p className="mt-2 text-[11px] tracking-wider text-muted-foreground">
            SHARE THE LINK SO FRIENDS CAN JOIN · PICK A CHAT HANDLE TO ENTER THE
            PARTY
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
          <StreamPlayer streams={streams} room={slug} />
          <ChatPanel room={slug} onMembersChange={setMembers} />
        </div>
      </main>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="pixel-shadow w-full max-w-md border-2 border-teletext-yellow bg-card p-6">
            <p className="font-display glow-yellow text-[11px] tracking-wider text-teletext-yellow">
              ⚠ END WATCH PARTY?
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You&apos;re the last one here. Leaving will end the party — it will
              disappear from the live list.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className={cn(
                  "pixel-press font-display border-2 border-teletext-cyan/50 px-3 py-1.5 text-[8px] tracking-wider text-teletext-cyan",
                  "hover:border-teletext-yellow hover:text-teletext-yellow",
                )}
              >
                STAY
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="pixel-press font-display border-2 border-teletext-yellow bg-teletext-yellow px-3 py-1.5 text-[8px] tracking-wider text-background"
              >
                LEAVE & END
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
