"use client";

import { useState } from "react";
import type { TabId, WorldCupData } from "@/lib/types";
import { WavyBackground } from "@/components/retro/wavy-background";
import { TabBar } from "@/components/retro/tab-bar";
import { Ticker } from "@/components/retro/ticker";
import { BroadcastClock } from "@/components/retro/clock";
import { SignalPanel } from "@/components/panels/signal-panel";
import { GroupsPanel } from "@/components/panels/groups-panel";
import { SquadsPanel } from "@/components/panels/squads-panel";
import { FixturesPanel } from "@/components/panels/fixtures-panel";
import { VenuesPanel } from "@/components/panels/venues-panel";

export function WorldCupApp({ data }: { data: WorldCupData }) {
  const [tab, setTab] = useState<TabId>("signal");

  return (
    <div className="min-h-screen p-2 sm:p-5 md:p-8 lg:p-10">
      <div className="crt-bezel mx-auto max-w-7xl">
        <div className="crt-shell min-h-[88vh]">
          <WavyBackground />
          <div className="crt-content">
            <header className="border-b-2 border-foreground">
              <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4">
                <div className="flex items-baseline gap-3 sm:gap-4">
                  <h1 className="font-display glow-yellow text-base leading-none tracking-tight sm:text-lg md:text-xl">
                    WC/26
                  </h1>
                  <span className="glow-cyan hidden text-[11px] tracking-[0.3em] text-teletext-cyan sm:inline">
                    TELETEXT DATA SERVICE
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] tracking-widest text-teletext-cyan sm:gap-4">
                  <span className="glow-green hidden text-teletext-green sm:inline">
                    ● LIVE
                  </span>
                  <span className="inline-block h-2.5 w-2.5 animate-blink bg-teletext-green" />
                  <BroadcastClock />
                </div>
              </div>
              <Ticker data={data} />
            </header>

            <TabBar active={tab} onChange={setTab} />

            <main className="p-3 sm:p-4 md:p-6">
              {tab === "signal" && <SignalPanel data={data} />}
              {tab === "groups" && <GroupsPanel data={data} />}
              {tab === "squads" && <SquadsPanel data={data} />}
              {tab === "fixtures" && <FixturesPanel data={data} />}
              {tab === "venues" && <VenuesPanel data={data} />}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
