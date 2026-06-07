import { groupHeaderColor } from "@/lib/teletext";
import type { Team, WorldCupData } from "@/lib/types";

function StandingRow({
  rank,
  team,
  standing,
}: {
  rank: number;
  team?: Team;
  standing: { pts: number; mp: number; gf: number; ga: number; gd: number };
}) {
  const qualifying = rank <= 2;
  return (
    <tr className="border-b border-foreground/20 text-sm last:border-0 sm:text-base">
      <td className="py-2">
        <span
          className={
            qualifying
              ? "text-teletext-green glow-green"
              : "text-muted-foreground"
          }
        >
          {rank}
        </span>
      </td>
      <td className="overflow-hidden py-2 pr-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-teletext-cyan">
            {team?.fifaCode ?? "TBD"}
          </span>
          <span className="truncate text-muted-foreground">
            {team?.name ?? "TBD"}
          </span>
        </div>
      </td>
      <td className="py-2 text-center text-muted-foreground">{standing.mp}</td>
      <td className="py-2 text-center text-muted-foreground">{standing.gf}</td>
      <td className="py-2 text-center text-muted-foreground">{standing.ga}</td>
      <td className="py-2 text-center text-muted-foreground">{standing.gd}</td>
      <td className="font-display glow-yellow py-2 text-right text-xs text-teletext-yellow">
        {standing.pts}
      </td>
    </tr>
  );
}

export function GroupsPanel({ data }: { data: WorldCupData }) {
  const teamMap = new Map(data.teams.map((t) => [t.id, t]));

  return (
    <div>
      <header className="pixel-shadow mb-6 border-2 border-foreground bg-secondary/40 p-4 sm:p-5">
        <p className="text-xs tracking-[0.3em] text-teletext-cyan">
          ▌TRANSMISSION 002 / GROUP STAGE
        </p>
        <h2 className="font-display glow-yellow mt-3 text-base tracking-tight text-teletext-yellow sm:text-lg">
          STANDINGS TABLE
        </h2>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.groups.map((group, i) => (
          <div
            key={group.name}
            className="pixel-shadow border-2 border-foreground bg-card"
          >
            <div
              className={`flex items-center justify-between border-b-2 border-foreground px-3 py-2.5 ${groupHeaderColor(i)}`}
            >
              <span className="font-display text-[11px] sm:text-xs">
                GROUP {group.name}
              </span>
              <span className="font-display text-[7px] tracking-widest sm:text-[8px]">
                4 TEAMS
              </span>
            </div>
            <div className="px-3">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[2.2rem]" />
                  <col />
                  <col className="w-[2.2rem]" />
                  <col className="w-[2.2rem]" />
                  <col className="w-[2.2rem]" />
                  <col className="w-[2.2rem]" />
                  <col className="w-[2.6rem]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-foreground/40 text-[11px] tracking-wider text-muted-foreground sm:text-xs">
                    <th className="py-2 text-left">#</th>
                    <th className="py-2 text-left">TEAM</th>
                    <th className="py-2 text-center">MP</th>
                    <th className="py-2 text-center">GF</th>
                    <th className="py-2 text-center">GA</th>
                    <th className="py-2 text-center">GD</th>
                    <th className="py-2 text-right">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {group.standings.map((standing, idx) => (
                    <StandingRow
                      key={standing.teamId}
                      rank={idx + 1}
                      team={teamMap.get(standing.teamId)}
                      standing={standing}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
