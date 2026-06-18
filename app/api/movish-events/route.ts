import { fetchMovishGroups } from "@/lib/movish";

/**
 * Same-origin endpoint for the LIVE panel's "Backup Live 2" subpanel. Returns
 * the current movish.net World Cup channels as a group of LiveEvent rows.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const groups = await fetchMovishGroups(60);
  return Response.json(
    { groups },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } },
  );
}
