import Link from "next/link";
import { WavyBackground } from "@/components/retro/wavy-background";
import { LightsOutToggle } from "@/components/retro/lights-out-toggle";
import { WatchPartyRoom } from "@/components/live/watch-party-room";
import { parsePartySlug } from "@/lib/watch-party";
import type { LiveStream } from "@/lib/types";

/**
 * Watch party room. The party is a Pusher presence room keyed by the slug; the
 * movie (IMDb id + title + playimdb embed) is rebuilt from the slug alone — no
 * backend store. See lib/watch-party for the slug format.
 */
export default async function WatchPartyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const party = parsePartySlug(slug);

  return (
    <div className="min-h-screen p-2 sm:p-5 md:p-8 lg:p-10">
      <div className="crt-bezel mx-auto max-w-7xl">
        <div className="crt-shell min-h-[88vh]">
          <WavyBackground />
          <div className="crt-content">
            {party ? (
              <WatchPartyRoom
                slug={slug}
                title={party.title}
                streams={
                  [
                    { name: party.title, url: party.embedUrl, vip: false },
                  ] satisfies LiveStream[]
                }
              />
            ) : (
              <>
                <header className="flex items-center justify-between gap-3 border-b-2 border-foreground px-3 py-3 sm:px-4">
                  <Link
                    href="/"
                    className="font-display pixel-press text-[10px] tracking-wider text-teletext-cyan hover:text-teletext-yellow"
                  >
                    ◄ BACK
                  </Link>
                  <LightsOutToggle />
                </header>
                <main className="p-6">
                  <div className="pixel-shadow border-2 border-teletext-amber/60 bg-teletext-amber/10 p-6">
                    <p className="font-display glow-soft text-[11px] tracking-wider text-teletext-amber">
                      ✕ PARTY NOT FOUND
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      This watch party link is invalid or has expired. Head back
                      and start a new one from the WATCH PARTY tab.
                    </p>
                  </div>
                </main>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
