/**
 * Pure, dependency-free chat constants/helpers shared by the server route and
 * the client component. No `pusher`/`pusher-js` imports here so it's safe to
 * pull into a "use client" bundle.
 */

export const CHAT_EVENT = "message";

// Presence channels MUST start with "presence-". One channel per room carries
// both the member list and the messages.
export const CHANNEL_PREFIX = "presence-chat-";

// Pusher channel names allow [A-Za-z0-9_\-=@,.;]. Slugs are kebab-case, but
// sanitize defensively so a stray char can't break the subscribe/trigger.
export function chatChannel(room: string): string {
  const safe = room.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) || "lobby";
  return `${CHANNEL_PREFIX}${safe}`;
}

// Inverse of chatChannel for the occupancy endpoint: presence-chat-<slug> → <slug>.
export function roomFromChannel(channel: string): string {
  return channel.startsWith(CHANNEL_PREFIX)
    ? channel.slice(CHANNEL_PREFIX.length)
    : channel;
}
