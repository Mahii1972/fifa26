import { randomUUID } from "node:crypto";
import {
  getPusherServer,
  pusherConfigured,
  pusherPublicConfig,
} from "@/lib/pusher-server";
import { CHAT_EVENT, chatChannel } from "@/lib/chat-shared";
import type { ChatMessage } from "@/lib/types";

/**
 * Ephemeral live-chat relay. Nothing is stored: the browser POSTs a message,
 * we fan it out to everyone subscribed to the room's public Pusher channel,
 * and it's gone. GET hands the client the public key/cluster so it can connect
 * without us shipping those as NEXT_PUBLIC_ env vars.
 */
export const dynamic = "force-dynamic";

const MAX_TEXT = 500;
const MAX_NAME = 32;

export async function GET() {
  return Response.json(
    { configured: pusherConfigured, ...pusherPublicConfig },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!pusherConfigured) {
    return Response.json({ error: "chat not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { room, user, text } = (body ?? {}) as Record<string, unknown>;

  if (typeof room !== "string" || !room.trim()) {
    return Response.json({ error: "room required" }, { status: 400 });
  }
  if (typeof user !== "string" || !user.trim()) {
    return Response.json({ error: "user required" }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "text required" }, { status: 400 });
  }

  const message: ChatMessage = {
    id: randomUUID(),
    user: user.trim().slice(0, MAX_NAME),
    text: text.trim().slice(0, MAX_TEXT),
    ts: Date.now(),
  };

  await getPusherServer().trigger(chatChannel(room), CHAT_EVENT, message);

  return Response.json({ ok: true, message }, { status: 200 });
}
