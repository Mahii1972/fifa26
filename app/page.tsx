import { WorldCupApp } from "@/components/world-cup-app";
import { getWorldCupData } from "@/lib/data";

export default function Home() {
  const data = getWorldCupData();

  return <WorldCupApp data={data} />;
}