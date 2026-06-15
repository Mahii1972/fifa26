import Pusher from "pusher";

/**
 * Server-side Pusher client. Holds the app secret, so this module must only
 * ever be imported from server code (route handlers) — never a client
 * component. Reused across requests via a module-level singleton so we don't
 * re-create the client on every invocation.
 */

const appId = process.env.PUSHER_APP_ID;
const key = process.env.PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.PUSHER_CLUSTER;

export const pusherConfigured = Boolean(appId && key && secret && cluster);

// Public bits the browser needs to connect. Safe to expose.
export const pusherPublicConfig = { key: key ?? "", cluster: cluster ?? "" };

let client: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherConfigured) {
    throw new Error(
      "Pusher is not configured — set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER.",
    );
  }
  if (!client) {
    client = new Pusher({
      appId: appId!,
      key: key!,
      secret: secret!,
      cluster: cluster!,
      useTLS: true,
    });
  }
  return client;
}
