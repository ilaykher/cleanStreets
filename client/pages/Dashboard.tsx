import { useMemo, type ReactNode } from "react";
import { CountMinSketch } from "@/lib/count-min-sketch";
import { FORECAST_TRIALS, HOTSPOT_THRESHOLD, forecastAreas } from "@/lib/forecast";
import { useHazardState } from "@/lib/hazard-store";
import { AREAS, HAZARD_TYPES, filterReports, getHazardType, type Area, type HazardTypeId } from "@/lib/hazards";
import { cn } from "@/lib/utils";

interface AreaRow {
  area: Area;
  verified: number;
  pending: number;
  resolved: number;
  rejected: number;
  mostCommon: string;
}

export default function Dashboard() {
  const { reports: allReports, filters } = useHazardState();
  const reports = filterReports(allReports, filters);
  const totals = useMemo(() => ({
    verified: reports.filter((report) => report.status === "verified").length,
    pending: reports.filter((report) => report.status === "pending").length,
    resolved: reports.filter((report) => report.status === "resolved").length,
    rejected: reports.filter((report) => report.status === "rejected").length,
  }), [reports]);

  const areaRows = useMemo<AreaRow[]>(() => AREAS.map((area) => {
    const inArea = reports.filter((report) => report.area === area);
    const counts = new Map<HazardTypeId, number>();
    inArea.filter((report) => report.status !== "rejected").forEach((report) => counts.set(report.typeId, (counts.get(report.typeId) ?? 0) + 1));
    const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return {
      area,
      verified: inArea.filter((report) => report.status === "verified").length,
      pending: inArea.filter((report) => report.status === "pending").length,
      resolved: inArea.filter((report) => report.status === "resolved").length,
      rejected: inArea.filter((report) => report.status === "rejected").length,
      mostCommon: top ? `${getHazardType(top[0]).label} (${top[1]})` : "None yet",
    };
  }).sort((a, b) => b.verified - a.verified || b.pending - a.pending), [reports]);

  const commonHazards = useMemo(() => {
    const sketch = new CountMinSketch();
    allReports.forEach((report) => sketch.add(report.typeId));
    return HAZARD_TYPES.map((type) => ({ type, count: sketch.estimate(type.id) }))
      .sort((a, b) => b.count - a.count || a.type.label.localeCompare(b.type.label));
  }, [allReports]);

  const forecast = useMemo(
    () => forecastAreas(reports, AREAS).sort((a, b) => b.hotspotProbability - a.hotspotProbability),
    [reports],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 pb-16 pt-8 sm:pt-12">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Community Dashboard</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Community Dashboard</h1>
        <p className="mt-2 text-muted-foreground">See where hazards are concentrated in Bagong Silang.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Verified hazards" value={totals.verified} accent="text-emerald-700" />
        <StatCard label="Pending reports" value={totals.pending} accent="text-slate-600" />
        <StatCard label="Resolved hazards" value={totals.resolved} accent="text-zinc-700" />
        <StatCard label="Rejected reports" value={totals.rejected} accent="text-zinc-700" />
        <StatCard label="Filtered reports" value={reports.length} accent="text-foreground" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Hazards per barangay" description="Pending, verified, and resolved counts with the most common hazard type." className="lg:col-span-2">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-2 py-2 font-bold">Barangay</th><th className="px-2 py-2 font-bold">Pending</th><th className="px-2 py-2 font-bold">Verified</th><th className="px-2 py-2 font-bold">Resolved</th><th className="px-2 py-2 font-bold">Rejected</th><th className="px-2 py-2 font-bold">Most common type</th></tr></thead>
              <tbody className="divide-y divide-border">{areaRows.map((row) => <tr key={row.area}><td className="px-2 py-3 font-bold">{row.area}</td><td className="px-2 py-3 tabular-nums">{row.pending}</td><td className="px-2 py-3 tabular-nums">{row.verified}</td><td className="px-2 py-3 tabular-nums">{row.resolved}</td><td className="px-2 py-3 tabular-nums">{row.rejected}</td><td className="px-2 py-3">{row.mostCommon}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>

        <Panel title="List of commonly reported hazards" description="Most frequently reported hazard">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-2 py-2 font-bold">Hazard</th><th className="px-2 py-2 text-right font-bold">Estimated Report</th></tr></thead>
              <tbody className="divide-y divide-border">{commonHazards.map(({ type, count }) => <tr key={type.id}><td className="px-2 py-2 font-semibold">{type.label}</td><td className="px-2 py-2 text-right tabular-nums">~{count}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Weekly hazard forecast" description="Predicts barangays likely to become hotspots next week based on recent report patterns. A hotspot means 3 or more verified hazards are expected within one week..">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-2 py-2 font-bold">Predicted hotspot barangay</th><th className="px-2 py-2 font-bold">Expected verified</th><th className="px-2 py-2 font-bold">Likely hazard type</th><th className="px-2 py-2 font-bold">Hotspot probability</th></tr></thead>
            <tbody className="divide-y divide-border">{forecast.map((row) => <tr key={row.area}><td className="px-2 py-3 font-bold">{row.area}</td><td className="px-2 py-3 tabular-nums">{row.expectedVerified.toFixed(1)}</td><td className="px-2 py-3">{row.likelyHazardType}</td><td className="px-2 py-3 tabular-nums">{Math.round(row.hotspotProbability * 100)}%</td></tr>)}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-card"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className={cn("mt-2 text-3xl font-extrabold tabular-nums", accent)}>{value}</p></div>;
}

function Panel({ title, description, className, children }: { title: string; description: string; className?: string; children: ReactNode }) {
  return <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6", className)}><h2 className="text-lg font-extrabold tracking-tight">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p><div className="mt-5">{children}</div></section>;
}
