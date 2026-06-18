import { fetchPpvGroups } from "@/lib/ppv-events";

/**
 * Same-origin endpoint for the LIVE panel's "Backup Live 1" subpanel. Returns
 * ppv.to events grouped by category, normalized to LiveEvent rows. Fetched
 * server-side so the panel renders it with the same UI as the main feed.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const groups = await fetchPpvGroups(30);
  return Response.json(
    { groups },
    { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } },
  );
}
