import { getWorldCupData } from "@/lib/data";
import { getLiveOverlay } from "@/lib/live-data";

/**
 * Live overlay endpoint polled by the client every 30s. Returns only the
 * volatile slice (matches + standings) so the client can refresh scores
 * without re-shipping the static teams/venues/squads. Always fresh (no-store).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const base = getWorldCupData();
  const overlay = await getLiveOverlay(base); // no revalidate -> no-store fetch
  return Response.json(overlay, {
    headers: { "Cache-Control": "no-store" },
  });
}
