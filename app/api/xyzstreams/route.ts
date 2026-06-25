import { fetchXyzStreams } from "@/lib/xyzstreams";

/**
 * Same-origin endpoint for the LIVE panel's "Backup Live 3" subpanel. Returns
 * xyzstreams.st World Cup broadcaster feeds grouped as a single category,
 * normalized to LiveEvent rows so the panel renders them like the other feeds.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const groups = await fetchXyzStreams(60);
  return Response.json(
    { groups },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } },
  );
}
