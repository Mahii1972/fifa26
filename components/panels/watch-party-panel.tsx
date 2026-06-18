"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MovieResult } from "@/lib/movie-search";
import { WP_PREFIX, buildPartySlug, parsePartySlug } from "@/lib/watch-party";

const MIN_QUERY = 2;

interface Party {
  slug: string;
  title: string;
  count: number;
}

/** Watch Party tab — search a movie to start a party, or join a live one. */
export function WatchPartyPanel() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MovieResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [parties, setParties] = useState<Party[]>([]);

  const searching = query.trim().length >= MIN_QUERY;

  // Search as the user types, debounced. State is only set inside the timer /
  // async callbacks (never synchronously in the effect body), and an in-flight
  // request is aborted when the query changes or the panel unmounts.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) return;

    const ctrl = new AbortController();
    let live = true;
    const timer = setTimeout(() => {
      setStatus("loading");
      fetch(`/api/movie-search?q=${encodeURIComponent(q)}`, {
        signal: ctrl.signal,
      })
        .then((res) => res.json() as Promise<{ results?: MovieResult[] }>)
        .then((data) => {
          if (!live) return;
          setResults(data.results ?? []);
          setStatus("ready");
        })
        .catch(() => {
          if (live) setStatus("error");
        });
    }, 300);

    return () => {
      live = false;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  // Poll the live "active parties" list from presence occupancy. A party shows
  // up while ≥1 person is in its room and drops off when the last one leaves.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/chat/online", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          counts?: Record<string, number>;
        };
        if (cancelled) return;
        const list = Object.entries(data.counts ?? {})
          .filter(([room, n]) => room.startsWith(WP_PREFIX) && n > 0)
          .map(([room, n]): Party | null => {
            const p = parsePartySlug(room);
            return p ? { slug: room, title: p.title, count: n } : null;
          })
          .filter((p): p is Party => p !== null)
          .sort((a, b) => b.count - a.count);
        setParties(list);
      } catch {
        /* keep last-known list */
      }
    }
    poll();
    const id = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  function startParty(movie: MovieResult) {
    router.push(`/watchparty/${buildPartySlug({ id: movie.id, title: movie.title })}`);
  }

  return (
    <div>
      <header className="pixel-shadow mb-6 border-2 border-foreground bg-secondary/40 p-5">
        <p className="text-xs tracking-[0.3em] text-teletext-cyan">
          ▌TRANSMISSION 006 / WATCH PARTY
        </p>
        <h2 className="font-display glow-yellow mt-3 text-base tracking-tight text-teletext-yellow sm:text-lg">
          WATCH PARTY
        </h2>
        <p className="mt-2 text-xs text-teletext-cyan">
          SEARCH A MOVIE TO START A PARTY · OR JOIN A LIVE ONE BELOW
        </p>
      </header>

      <section className="mb-6 border-2 border-foreground">
        <h3 className="font-display glow-cyan border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
          ▓ MOVIE SEARCH
        </h3>

        <div className="p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={80}
            placeholder="TYPE A TITLE — E.G. INCEPTION"
            className="font-display w-full border-2 border-teletext-cyan/40 bg-background px-3 py-2.5 text-xs tracking-wider text-foreground placeholder:text-muted-foreground focus:border-teletext-yellow focus:outline-none"
          />

          {!searching && (
            <p className="mt-3 text-[11px] tracking-wider text-muted-foreground">
              ░ TYPE AT LEAST {MIN_QUERY} CHARACTERS · CLICK A RESULT TO START A
              PARTY
            </p>
          )}

          {searching && (
            <div className="mt-4 space-y-0 border-2 border-foreground">
              {status === "loading" && results.length === 0 && (
                <p className="p-4 text-[11px] tracking-wider text-teletext-amber">
                  ░ SEARCHING…
                </p>
              )}
              {status === "error" && (
                <p className="p-4 text-[11px] tracking-wider text-teletext-amber">
                  ✕ SEARCH FAILED — TRY AGAIN
                </p>
              )}
              {status === "ready" && results.length === 0 && (
                <p className="p-4 text-[11px] tracking-wider text-muted-foreground">
                  ░ NO RESULTS
                </p>
              )}

              {results.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => startParty(m)}
                  className="flex w-full items-start gap-3 border-b border-foreground/20 p-3 text-left transition-colors last:border-0 hover:bg-muted"
                >
                  {m.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.poster}
                      alt=""
                      loading="lazy"
                      className="h-20 w-14 shrink-0 border border-foreground/40 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-14 shrink-0 items-center justify-center border border-foreground/40 bg-secondary/40 text-[8px] text-muted-foreground">
                      NO IMG
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="glow-soft truncate text-sm text-teletext-cyan">
                      {m.title}
                      {m.year && (
                        <span className="ml-2 text-muted-foreground">
                          {m.year}
                        </span>
                      )}
                    </p>
                    {m.actors && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {m.actors}
                      </p>
                    )}
                    <p className="font-display mt-2 text-[8px] tracking-wider text-teletext-yellow">
                      ▶ START PARTY
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-2 border-foreground">
        <h3 className="font-display glow-cyan border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
          ▓ LIVE PARTIES
        </h3>

        {parties.length === 0 ? (
          <p className="p-4 text-[11px] tracking-wider text-muted-foreground">
            ░ NO ACTIVE PARTIES — START ONE ABOVE
          </p>
        ) : (
          <div className="space-y-0">
            {parties.map((p) => (
              <div
                key={p.slug}
                className="flex items-center justify-between gap-3 border-b border-foreground/20 p-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="glow-soft truncate text-sm text-teletext-cyan">
                    {p.title.toUpperCase()}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] tracking-widest text-teletext-green">
                    <span className="inline-block h-2 w-2 animate-blink bg-teletext-green" />
                    {p.count} WATCHING
                  </p>
                </div>
                <Link
                  href={`/watchparty/${p.slug}`}
                  className="pixel-press font-display shrink-0 border-2 border-teletext-yellow bg-teletext-yellow px-3 py-1.5 text-[8px] tracking-wider text-background"
                >
                  JOIN
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
