import { useMemo, type ReactNode } from "react";
import { FORECAST_TRIALS, HOTSPOT_THRESHOLD, forecastAreas } from "@/lib/forecast";
import { CountMinSketch } from "@/lib/count-min-sketch";
import { useHazardState } from "@/lib/hazard-store";
import {
  AREAS,
  HAZARD_TYPES,
  getHazardType,
  isActiveStatus,
  type Area,
  type HazardTypeId,
} from "@/lib/hazards";
import { cn } from "@/lib/utils";

interface AreaRow {
  area: Area;
  verified: number;
  total: number;
  mostCommon: string;
  repeated: number;
  pending: number;
  resolved: number;
  rejected: number;
}

export default function Dashboard() {
  const { reports } = useHazardState();

  const totals = useMemo(
    () => ({
      verified: reports.filter((r) => isActiveStatus(r.status)).length,
      pending: reports.filter((r) => r.status === "pending").length,
      rejected: reports.filter((r) => r.status === "rejected").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
    }),
    [reports],
  );

  const trend = useMemo(() => {
    const now = Date.now();
    const recentSketch = new CountMinSketch();
    const previousSketch = new CountMinSketch();
    for (const report of reports) {
      const age = now - Date.parse(report.createdAt);
      if (age >= 0 && age <= 14 * 86_400_000) recentSketch.add(report.typeId);
      else if (age > 14 * 86_400_000 && age <= 28 * 86_400_000) previousSketch.add(report.typeId);
    }
    return HAZARD_TYPES.map((type) => ({
      id: type.id,
      label: type.label,
      recent: recentSketch.estimate(type.id),
      previous: previousSketch.estimate(type.id),
    }))
      .filter((row) => row.recent > 0 || row.previous > 0)
      .sort((a, b) => b.recent - a.recent);
  }, [reports]);

  const areaRows = useMemo<AreaRow[]>(
    () =>
      AREAS.map((area) => {
        const inArea = reports.filter((r) => r.area === area);
        const countsByType = new Map<HazardTypeId, number>();
        inArea.forEach((r) => countsByType.set(r.typeId, (countsByType.get(r.typeId) ?? 0) + 1));
        const [topType] = [...countsByType.entries()].sort((a, b) => b[1] - a[1]);
        return {
          area,
          total: inArea.length,
          verified: inArea.filter((r) => isActiveStatus(r.status)).length,
          mostCommon: topType ? getHazardType(topType[0]).label : "None yet",
          repeated: [...countsByType.values()].filter((count) => count >= 2).length,
          pending: inArea.filter((r) => r.status === "pending").length,
          resolved: inArea.filter((r) => r.status === "resolved").length,
          rejected: inArea.filter((r) => r.status === "rejected").length,
        };
      }).sort((a, b) => b.verified - a.verified),
    [reports],
  );

  const forecast = useMemo(() => forecastAreas(reports, AREAS), [reports]);

  const maxTrend = Math.max(1, ...trend.map((row) => row.recent));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 pb-16 pt-8 sm:pt-12">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Community insights</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          See how hazard reports are changing across Bagong Silang.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Greedy online filtering decides at three net votes. Count-Min Sketch tracks hazard-type trends, and Monte Carlo trials estimate weekly hotspots.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Verified hazards" value={totals.verified} accent="text-emerald-700" />
        <StatCard label="Pending reports" value={totals.pending} accent="text-slate-600" />
        <StatCard label="Resolved reports" value={totals.resolved} accent="text-teal-700" />
        <StatCard label="Rejected reports" value={totals.rejected} accent="text-zinc-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Hazard hotspots" description="Verified hazards per area, with the most common type." className="lg:col-span-2">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-bold">Area</th>
                  <th className="px-2 py-2 font-bold">Total</th>
                  <th className="px-2 py-2 font-bold">Verified</th>
                  <th className="px-2 py-2 font-bold">Most common</th>
                  <th className="px-2 py-2 font-bold">Repeats</th>
                  <th className="px-2 py-2 font-bold">Pending</th>
                  <th className="px-2 py-2 font-bold">Resolved</th>
                  <th className="px-2 py-2 font-bold">Rejected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {areaRows.map((row) => (
                  <tr key={row.area}>
                    <td className="px-2 py-3 font-bold">{row.area}</td>
                    <td className="px-2 py-3 font-extrabold tabular-nums">{row.total}</td>
                    <td className="px-2 py-3 tabular-nums">{row.verified}</td>
                    <td className="px-2 py-3">{row.mostCommon}</td>
                    <td className="px-2 py-3 tabular-nums">{row.repeated}</td>
                    <td className="px-2 py-3 tabular-nums">{row.pending}</td>
                    <td className="px-2 py-3 tabular-nums">{row.resolved}</td>
                    <td className="px-2 py-3 tabular-nums">{row.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </Panel>
        <Panel title="Trend tracker" description="Count-Min Sketch estimates from the latest 14 days compared with the previous 14 days; estimates may slightly overcount.">
          {trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports yet.</p>
          ) : (
            <ul className="space-y-3">
              {trend.map((row) => (
                <li key={row.id}>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{row.label}</span>
                    <span className="tabular-nums">{row.recent} · {row.recent > row.previous ? "Increasing" : row.recent < row.previous ? "Decreasing" : "Unchanged"}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(row.recent / maxTrend) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Weekly hazard forecast"
        description={`Monte Carlo simulation with ${FORECAST_TRIALS.toLocaleString()} trials per area. Hotspot means ${HOTSPOT_THRESHOLD}+ verified hazards in a week.`}
      >
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-bold">Area</th>
                <th className="px-2 py-2 font-bold">Expected verified</th>
                <th className="px-2 py-2 font-bold">Hotspot probability</th>
                <th className="px-2 py-2 font-bold">Recommended volunteers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {forecast.map((row) => (
                <tr key={row.area}>
                  <td className="px-2 py-3 font-bold">{row.area}</td>
                  <td className="px-2 py-3 tabular-nums">{row.expectedVerified.toFixed(1)}</td>
                  <td className="px-2 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums",
                        row.hotspotProbability >= 0.5
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700",
                      )}
                    >
                      {Math.round(row.hotspotProbability * 100)}%
                    </span>
                  </td>
                  <td className="px-2 py-3 tabular-nums">{row.recommendedVolunteers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-3xl font-extrabold tabular-nums", accent)}>{value}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6", className)}>
      <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}
