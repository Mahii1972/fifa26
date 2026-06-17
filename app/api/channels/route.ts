import { fetchChannels } from "@/lib/channels";

/**
 * Same-origin proxy for the LIVE panel's 24/7 channels. The upstream feed gates
 * on Origin/Referer, so the client can't hit it directly — it polls this. The
 * panel shows the first few channels and tucks the rest behind an accordion.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const channels = await fetchChannels(300);
  return Response.json(
    { channels },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" } },
  );
}
