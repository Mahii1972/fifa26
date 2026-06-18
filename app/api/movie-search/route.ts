import { type NextRequest } from "next/server";
import { searchMovies } from "@/lib/movie-search";

/**
 * Same-origin endpoint for the Watch Party panel's movie search box. Proxies
 * the FM-DB / IMDbOT search API and returns normalized MovieResult rows.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchMovies(q);
  return Response.json(
    { results },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } },
  );
}
