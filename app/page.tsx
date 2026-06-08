import { WorldCupApp } from "@/components/world-cup-app";
import { getLiveWorldCupData } from "@/lib/live-data";

export default async function Home() {
  // CSV snapshot overlaid with live ESPN scores/standings (30s render cache).
  const data = await getLiveWorldCupData(30);

  return <WorldCupApp data={data} />;
}
