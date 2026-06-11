import Link from "next/link";
import { findLiveEvent } from "@/lib/live-events";
import { StreamPlayer } from "@/components/live/stream-player";
import type { LiveStream } from "@/lib/types";

// Always-on channels have no event entry — embed them directly by slug.
const CHANNEL_NAMES: Record<string, string> = {
  "fox-sports-1": "FOX SPORTS 1",
};

function kickoff(iso: string): string {
  const [date, time] = iso.split("T");
  return time ? `${date} · ${time}` : iso;
}

export default async function LiveWatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await findLiveEvent(slug);

  // Event → its feeds; otherwise treat the slug as a direct channel embed.
  const title = event?.name ?? CHANNEL_NAMES[slug] ?? slug.replace(/-/g, " ");
  const streams: LiveStream[] = event
    ? event.streams
    : [
        {
          name: CHANNEL_NAMES[slug] ?? slug,
          url: `https://junkieembeds.pages.dev/embed/${slug}`,
          vip: false,
        },
      ];

  return (
    <div className="min-h-screen p-2 sm:p-5 md:p-8 lg:p-10">
      <div className="crt-bezel mx-auto max-w-5xl">
        <div className="crt-shell min-h-[88vh]">
          <div className="crt-content">
            <header className="flex items-center justify-between gap-3 border-b-2 border-foreground px-3 py-3 sm:px-4">
              <Link
                href="/"
                className="font-display pixel-press text-[10px] tracking-wider text-teletext-cyan hover:text-teletext-yellow"
              >
                ◄ BACK
              </Link>
              <span className="glow-cyan hidden text-[11px] tracking-[0.3em] text-teletext-cyan sm:inline">
                LIVE BROADCAST
              </span>
            </header>

            <main className="p-3 sm:p-4 md:p-6">
              <header className="pixel-shadow mb-6 border-2 border-foreground bg-secondary/40 p-5">
                <p className="text-xs tracking-[0.3em] text-teletext-cyan">
                  ▌LIVE TRANSMISSION
                </p>
                <h1 className="font-display glow-yellow mt-3 text-base tracking-tight text-teletext-yellow sm:text-lg">
                  {title.toUpperCase()}
                </h1>
                {event && (
                  <p className="mt-2 text-xs tracking-widest text-teletext-amber">
                    KICKOFF {kickoff(event.time)}
                  </p>
                )}
              </header>

              <StreamPlayer streams={streams} />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
