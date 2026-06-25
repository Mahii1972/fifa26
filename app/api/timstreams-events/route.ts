import { fetchTimstreamsGroups } from "@/lib/timstreams";

/**
 * Same-origin endpoint for Backup Server 3. Returns api.vixnuvew.uk live
 * events grouped for the LIVE panel.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const groups = await fetchTimstreamsGroups(60);
  return Response.json(
    { groups },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } },
  );
}
