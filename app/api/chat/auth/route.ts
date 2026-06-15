import { randomUUID } from "node:crypto";
import { getPusherServer, pusherConfigured } from "@/lib/pusher-server";

/**
 * Presence-channel authorizer. pusher-js POSTs socket_id + channel_name here
 * (form-encoded) when subscribing to a presence channel; we also pass the
 * chosen display name as `user` so it shows up in the member list. The signed
 * response is what lets the client join — the secret never leaves the server.
 */
export const dynamic = "force-dynamic";

const MAX_NAME = 32;

export async function POST(request: Request) {
  if (!pusherConfigured) {
    return Response.json({ error: "chat not configured" }, { status: 503 });
  }

  const form = await request.formData();
  const socketId = form.get("socket_id");
  const channel = form.get("channel_name");
  const userRaw = form.get("user");

  if (typeof socketId !== "string" || typeof channel !== "string") {
    return Response.json({ error: "bad auth request" }, { status: 400 });
  }
  // Only ever authorize our own presence chat channels.
  if (!channel.startsWith("presence-chat-")) {
    return Response.json({ error: "forbidden channel" }, { status: 403 });
  }

  const name =
    typeof userRaw === "string" && userRaw.trim()
      ? userRaw.trim().slice(0, MAX_NAME)
      : "anon";

  const auth = getPusherServer().authorizeChannel(socketId, channel, {
    user_id: randomUUID(), // unique per connection
    user_info: { name },
  });

  return Response.json(auth);
}
