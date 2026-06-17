import Link from "next/link";
import { findLiveEvent } from "@/lib/live-events";
import { findChannel } from "@/lib/channels";
import { StreamPlayer } from "@/components/live/stream-player";
import { ChatPanel } from "@/components/live/chat-panel";
import type { LiveStream } from "@/lib/types";

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
  // Not a scheduled event? It may be an always-on channel from the feed.
  const channel = event ? undefined : await findChannel(slug);

  // Event/channel → its feeds; otherwise treat the slug as a direct embed.
  const title =
    event?.name ?? channel?.name ?? slug.replace(/-/g, " ");
  const streams: LiveStream[] =
    event?.streams ??
    channel?.streams ?? [
      {
        name: slug,
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

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
                <StreamPlayer streams={streams} room={slug} />
                <ChatPanel room={slug} />
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
