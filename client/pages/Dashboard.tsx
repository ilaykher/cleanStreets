import { useMemo, type ReactNode } from "react";
import { CountMinSketch } from "@/lib/count-min-sketch";
import { FORECAST_TRIALS, HOTSPOT_THRESHOLD, forecastAreas } from "@/lib/forecast";
import { useHazardState } from "@/lib/hazard-store";
import { AREAS, HAZARD_TYPES, getHazardType, type Area, type HazardTypeId } from "@/lib/hazards";
import { cn } from "@/lib/utils";

interface AreaRow {
  area: Area;
  confirmed: number;
  pending: number;
  resolved: number;
  mostCommon: string;
}

export default function Dashboard() {
  const { reports } = useHazardState();

  const totals = useMemo(
    () => ({
      confirmed: reports.filter((r) => r.status === "verified").length,
      pending: reports.filter((r) => r.status === "pending").length,
      rejected: reports.filter((r) => r.status === "resolved").length,
    }),
    [reports],
  );

  const trend = useMemo(() => {
    const overall = new CountMinSketch();
    const recent = new CountMinSketch();
    const previous = new CountMinSketch();
    reports.forEach((report) => {
      overall.add(report.typeId);
      const age = Date.now() - new Date(report.createdAt).getTime();
      if (age <= 7 * 86400000) recent.add(report.typeId);
      else if (age <= 14 * 86400000) previous.add(report.typeId);
    });
    const types = HAZARD_TYPES.map((type) => ({
      type,
      total: overall.estimate(type.id),
      current: recent.estimate(type.id),
      prior: previous.estimate(type.id),
    }));
    return [...types].sort((a, b) => b.total - a.total).map((row) => ({
      ...row,
      direction: row.current > row.prior ? "Increasing" : row.current < row.prior ? "Decreasing" : "Steady",
    }));
  }, [reports]);

  const areaRows = useMemo<AreaRow[]>(
    () =>
      AREAS.map((area) => {
        const inArea = reports.filter((r) => r.area === area);
        const countsByType = new Map<HazardTypeId, number>();
        inArea
          .filter((r) => r.status !== "rejected")
          .forEach((r) => countsByType.set(r.typeId, (countsByType.get(r.typeId) ?? 0) + 1));
        const [topType] = [...countsByType.entries()].sort((a, b) => b[1] - a[1]);
        return {
          area,
          confirmed: inArea.filter((r) => r.status === "verified").length,
          pending: inArea.filter((r) => r.status === "pending").length,
          resolved: inArea.filter((r) => r.status === "resolved").length,
          mostCommon: topType
            ? `${getHazardType(topType[0]).label} (${topType[1]})`
            : "None yet",
        };
      }).sort((a, b) => b.confirmed - a.confirmed || b.pending - a.pending),
    [reports],
  );

  const topArea = areaRows[0];

  const forecast = useMemo(() => forecastAreas(reports, AREAS), [reports]);


  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 pb-16 pt-8 sm:pt-12">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Community Dashboard</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Community Dashboard</h1>
        <p className="mt-2 text-muted-foreground">See where hazards are concentrated in Bagong Silang.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Confirmed hazards" value={totals.confirmed} accent="text-emerald-700" />
        <StatCard label="Pending reports" value={totals.pending} accent="text-slate-600" />
        <StatCard label="Resolved hazards" value={totals.rejected} accent="text-zinc-700" />
        <StatCard label="Total reports" value={reports.length} accent="text-foreground" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="Hazards per barangay"
          description="Confirmed and pending hazards in each barangay, and the most commonly reported type."
          className="lg:col-span-2"
        >
          {topArea && topArea.confirmed > 0 && (
            <p className="mb-4 text-sm font-semibold">
              Most confirmed hazards: <span className="text-primary">{topArea.area}</span> with{" "}
              {topArea.confirmed}.
            </p>
          )}
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-bold">Barangay</th>
                  <th className="px-2 py-2 font-bold">Confirmed</th>
                  <th className="px-2 py-2 font-bold">Pending</th>
                  <th className="px-2 py-2 font-bold">Resolved</th>
                  <th className="px-2 py-2 font-bold">Most commonly reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {areaRows.map((row) => (
                  <tr key={row.area}>
                    <td className="px-2 py-3 font-bold">{row.area}</td>
                    <td className="px-2 py-3 font-extrabold tabular-nums">{row.confirmed}</td>
                    <td className="px-2 py-3 tabular-nums">{row.pending}</td>
                    <td className="px-2 py-3 tabular-nums">{row.resolved}</td>
                    <td className="px-2 py-3">{row.mostCommon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Hazard Trends" description="Shows the most commonly reported hazard types and whether they are increasing or decreasing, based on the Count-Min Sketch algorithm.">
          <div className="flex items-center justify-between border-b border-border pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <span>Hazard list</span><span>Sample #</span>
          </div>
          <ul className="divide-y divide-border">
            {trend.map((row, index) => <li key={row.type.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <span className="min-w-0"><span className="font-semibold">{row.type.label}</span><span className="ml-2 text-xs text-muted-foreground">{index === 0 ? `Most common · ${row.direction}` : row.direction}</span></span>
              <span className="shrink-0 font-bold tabular-nums">~{row.total}</span>
            </li>)}
          </ul>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {forecast.map((row) => (
                <tr key={row.area}>
                  <td className="px-2 py-3 font-bold">{row.area}</td>
                  <td className="px-2 py-3 tabular-nums">{row.expectedVerified.toFixed(1)}</td>
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

function TrendList({
  title,
  rows,
  countKey,
}: {
  title: string;
  rows: Array<{ type: { id: string; label: string }; current: number; prior: number; total: number }>;
  countKey: "current" | "prior";
}) {
  return (
    <div>
      <h3 className="text-sm font-bold">{title}</h3>
      {rows.length ? <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {rows.map((row) => <li key={row.type.id} className="flex justify-between gap-3"><span>{row.type.label}</span><span className="tabular-nums">{row[countKey]} this week · {row.total} total</span></li>)}
      </ul> : <p className="mt-2 text-sm text-muted-foreground">No hazard types are {countKey === "current" ? "increasing" : "decreasing"}.</p>}
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
