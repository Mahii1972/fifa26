import { getPusherServer, pusherConfigured } from "@/lib/pusher-server";
import { SYNC_EVENT, chatChannel } from "@/lib/chat-shared";
import type { SyncPayload } from "@/lib/watch-party";

/**
 * Watch-party playback-sync relay. The host POSTs its player state and we fan it
 * out on the room's channel via the SYNC_EVENT. Ephemeral, like /api/chat — no
 * storage. Viewers can't be force-controlled (the embed takes no commands), so
 * this only powers a "host is at X / paused" indicator.
 */
export const dynamic = "force-dynamic";

// The embed remaps its events (play→"playing", pause→"paused", ended→"completed");
// accept both the raw and remapped names.
const STATUSES = new Set([
  "play",
  "pause",
  "playing",
  "paused",
  "seeked",
  "ended",
  "completed",
  "ready",
]);
const MAX_NAME = 32;

export async function POST(request: Request) {
  if (!pusherConfigured) {
    return Response.json({ error: "sync not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { room, status, progress, duration, host, hostId } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof room !== "string" || !room.trim()) {
    return Response.json({ error: "room required" }, { status: 400 });
  }
  if (typeof hostId !== "string" || !hostId.trim()) {
    return Response.json({ error: "hostId required" }, { status: 400 });
  }

  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;

  const payload: SyncPayload = {
    status: typeof status === "string" && STATUSES.has(status) ? status : "playing",
    progress: num(progress),
    duration: num(duration),
    host: typeof host === "string" ? host.trim().slice(0, MAX_NAME) || "HOST" : "HOST",
    hostId: hostId.trim().slice(0, 64),
    at: Date.now(),
  };

  await getPusherServer().trigger(chatChannel(room), SYNC_EVENT, payload);

  return Response.json({ ok: true }, { status: 200 });
}
