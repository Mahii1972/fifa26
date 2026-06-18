/**
 * Watch Party slugs. A party is just a Pusher presence room (see lib/chat-shared)
 * — no backend store — so the slug itself carries everything needed to rebuild
 * the room page and to label it in the lobby:
 *
 *   wp-<rand>-<imdbId>-<title-slug>     e.g. wp-x7k2-tt0133093-the-matrix
 *
 *  - "wp-"        marks party rooms (the lobby filters /api/chat/online on this)
 *  - <rand>       makes each "create party" click a distinct room
 *  - <imdbId>     builds the playimdb embed
 *  - <title-slug> a readable label for the room header and the lobby
 *
 * Stays inside chatChannel()'s 64-char [A-Za-z0-9_-] sanitizer.
 */
export const WP_PREFIX = "wp-";

const PLAYIMDB = "https://www.playimdb.com/title";

/** Title → url-safe slug fragment (lowercase, hyphenated, capped). */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

/** Build a fresh, unique party slug for a movie (client-side — uses randomness). */
export function buildPartySlug(movie: { id: string; title: string }): string {
  const rand = Math.random().toString(36).slice(2, 6);
  return `${WP_PREFIX}${rand}-${movie.id}-${slugifyTitle(movie.title)}`;
}

export interface ParsedParty {
  imdbId: string;
  title: string;
  embedUrl: string;
}

/**
 * Reconstruct a party's movie from its slug. Pure (no randomness) so it is safe
 * to call on the server (the room page) and the client (the lobby). Returns null
 * when the slug carries no IMDb id.
 */
export function parsePartySlug(slug: string): ParsedParty | null {
  const imdbId = slug.match(/tt\d+/)?.[0];
  if (!imdbId) return null;
  const after = slug.slice(slug.indexOf(imdbId) + imdbId.length).replace(/^-+/, "");
  const title = after ? after.replace(/-+/g, " ").trim() : imdbId;
  return { imdbId, title, embedUrl: `${PLAYIMDB}/${imdbId}/` };
}
