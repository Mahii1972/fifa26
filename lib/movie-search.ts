/**
 * Movie/series search via the FM-DB / IMDbOT API (imdb.iamidiotareyoutoo.com),
 * the search source for the Watch Party panel.
 *
 * Fetched server-side (see /api/movie-search) to avoid CORS and to normalize
 * the API's `#`-prefixed keys into a clean shape. Note: this returns IMDb
 * *metadata* only (title / year / poster) — not playable stream URLs.
 */
const SEARCH_API = "https://imdb.iamidiotareyoutoo.com/search";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

export interface MovieResult {
  id: string; // IMDb id, e.g. "tt1375666"
  title: string;
  year: number | null;
  poster: string;
  actors: string;
}

interface RawResult {
  "#TITLE"?: string;
  "#YEAR"?: number;
  "#IMDB_ID"?: string;
  "#ACTORS"?: string;
  "#IMG_POSTER"?: string;
}

/** Search the FM-DB API, normalized to MovieResult rows (empty on failure). */
export async function searchMovies(
  query: string,
  revalidate = 300,
): Promise<MovieResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(`${SEARCH_API}?q=${encodeURIComponent(q)}`, {
      headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
      next: { revalidate },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      ok?: boolean;
      description?: RawResult[];
    };
    if (!data.ok || !Array.isArray(data.description)) return [];
    return data.description
      .filter((r) => r["#IMDB_ID"] && r["#TITLE"])
      .map((r) => ({
        id: r["#IMDB_ID"] as string,
        title: r["#TITLE"] as string,
        year: typeof r["#YEAR"] === "number" ? r["#YEAR"] : null,
        poster: r["#IMG_POSTER"] ?? "",
        actors: r["#ACTORS"] ?? "",
      }));
  } catch {
    return [];
  }
}
