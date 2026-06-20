import { fetchStreamiGroups } from "@/lib/streami";

/**
 * Same-origin endpoint for the LIVE panel's "Backup Live 3" subpanel. Returns
 * streami.click events grouped by category, normalized to LiveEvent rows.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const groups = await fetchStreamiGroups(60);
  return Response.json(
    { groups },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } },
  );
}
