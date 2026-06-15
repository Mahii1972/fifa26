import { getPusherServer, pusherConfigured } from "@/lib/pusher-server";
import { CHANNEL_PREFIX, roomFromChannel } from "@/lib/chat-shared";

/**
 * Reports how many people are currently in each room's chat, keyed by slug:
 * { counts: { "usa-vs-brazil": 3 } }. The LIVE panel polls this to show a
 * "watching" badge per match. Asks Pusher for occupancy of all our presence
 * channels in one call — no per-room subscription needed.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!pusherConfigured) {
    return Response.json(
      { counts: {} },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const res = await getPusherServer().get({
      path: "/channels",
      params: { filter_by_prefix: CHANNEL_PREFIX, info: "user_count" },
    });
    if (!res.ok) throw new Error(`pusher ${res.status}`);

    const body = (await res.json()) as {
      channels?: Record<string, { user_count?: number }>;
    };

    const counts: Record<string, number> = {};
    for (const [channel, info] of Object.entries(body.channels ?? {})) {
      counts[roomFromChannel(channel)] = info.user_count ?? 0;
    }

    return Response.json(
      { counts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Occupancy is a nice-to-have — never fail the panel over it.
    return Response.json(
      { counts: {} },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
