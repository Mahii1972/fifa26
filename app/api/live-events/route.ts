import { fetchLiveEvents } from "@/lib/live-events";

/**
 * Same-origin proxy for the LIVE panel. The upstream feed gates on Origin/
 * Referer, so the client can't hit it directly — it polls this instead.
 * Returns all events across every sport (sorted by kickoff); the panel splits
 * out the featured ones and groups the rest by genre.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const events = (await fetchLiveEvents(60)).sort((a, b) =>
    a.time.localeCompare(b.time),
  );
  return Response.json(
    { events },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } },
  );
}
