import { useMemo, type ReactNode } from "react";
import { CountMinSketch } from "@/lib/count-min-sketch";
import { FORECAST_TRIALS, HOTSPOT_THRESHOLD, forecastAreas } from "@/lib/forecast";
import { setReportStatus, useHazardState } from "@/lib/hazard-store";
import {
  AREAS,
  HAZARD_TYPES,
  formatReportedAt,
  getHazardType,
  isActiveStatus,
  type Area,
  type HazardReport,
  type HazardTypeId,
} from "@/lib/hazards";
import { StatusBadge, SeverityChip } from "@/components/hazards/HazardCard";
import { cn } from "@/lib/utils";

interface AreaRow {
  area: Area;
  verified: number;
  mostCommon: string;
  repeated: number;
  pending: number;
  rejected: number;
}

export default function Dashboard() {
  const { reports } = useHazardState();

  const totals = useMemo(
    () => ({
      verified: reports.filter((r) => isActiveStatus(r.status)).length,
      pending: reports.filter((r) => r.status === "pending").length,
      rejected: reports.filter((r) => r.status === "rejected").length,
      forInspection: reports.filter((r) => r.status === "for_inspection").length,
    }),
    [reports],
  );

  const trend = useMemo(() => {
    const sketch = new CountMinSketch();
    reports.forEach((report) => sketch.add(report.typeId));
    return HAZARD_TYPES.map((type) => ({
      id: type.id,
      label: type.label,
      estimate: sketch.estimate(type.id),
    }))
      .filter((row) => row.estimate > 0)
      .sort((a, b) => b.estimate - a.estimate);
  }, [reports]);

  const areaRows = useMemo<AreaRow[]>(
    () =>
      AREAS.map((area) => {
        const inArea = reports.filter((r) => r.area === area);
        const active = inArea.filter((r) => isActiveStatus(r.status));
        const countsByType = new Map<HazardTypeId, number>();
        active.forEach((r) => countsByType.set(r.typeId, (countsByType.get(r.typeId) ?? 0) + 1));
        const [topType] = [...countsByType.entries()].sort((a, b) => b[1] - a[1]);
        return {
          area,
          verified: active.length,
          mostCommon: topType ? getHazardType(topType[0]).label : "None yet",
          repeated: [...countsByType.values()].filter((count) => count >= 2).length,
          pending: inArea.filter((r) => r.status === "pending").length,
          rejected: inArea.filter((r) => r.status === "rejected").length,
        };
      }).sort((a, b) => b.verified - a.verified),
    [reports],
  );

  const forecast = useMemo(() => forecastAreas(reports, AREAS), [reports]);

  const queue = useMemo(
    () =>
      reports
        .filter((r) => isActiveStatus(r.status))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reports],
  );

  const maxTrend = Math.max(1, ...trend.map((row) => row.estimate));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-5 pb-16 pt-8 sm:pt-12">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Coordinator dashboard</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          See which streets keep breaking, and where to send crews next.
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Verified hazards" value={totals.verified} accent="text-emerald-700" />
        <StatCard label="Pending reports" value={totals.pending} accent="text-slate-600" />
        <StatCard label="For inspection" value={totals.forInspection} accent="text-amber-700" />
        <StatCard label="Rejected reports" value={totals.rejected} accent="text-zinc-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Hazard hotspots" description="Verified hazards per area, with the most common type." className="lg:col-span-2">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-bold">Area</th>
                  <th className="px-2 py-2 font-bold">Verified</th>
                  <th className="px-2 py-2 font-bold">Most common</th>
                  <th className="px-2 py-2 font-bold">Repeats</th>
                  <th className="px-2 py-2 font-bold">Pending</th>
                  <th className="px-2 py-2 font-bold">Rejected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {areaRows.map((row) => (
                  <tr key={row.area}>
                    <td className="px-2 py-3 font-bold">{row.area}</td>
                    <td className="px-2 py-3 font-extrabold tabular-nums">{row.verified}</td>
                    <td className="px-2 py-3">{row.mostCommon}</td>
                    <td className="px-2 py-3 tabular-nums">{row.repeated}</td>
                    <td className="px-2 py-3 tabular-nums">{row.pending}</td>
                    <td className="px-2 py-3 tabular-nums">{row.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Trend tracker" description="Most reported hazard types, estimated with a Count-Min Sketch.">
          {trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports yet.</p>
          ) : (
            <ul className="space-y-3">
              {trend.map((row) => (
                <li key={row.id}>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{row.label}</span>
                    <span className="tabular-nums">{row.estimate}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(row.estimate / maxTrend) * 100}%` }}
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

      <Panel title="Verified hazard queue" description="Send confirmed hazards to inspection or mark them resolved.">
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">No verified hazards yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {queue.map((report) => (
              <QueueItem key={report.id} report={report} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function QueueItem({ report }: { report: HazardReport }) {
  const type = getHazardType(report.typeId);
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold">{type.label}</p>
          <StatusBadge status={report.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {report.area} · {report.upvotes} upvotes · reported {formatReportedAt(report.createdAt)}
        </p>
        <div className="mt-1">
          <SeverityChip typeId={report.typeId} />
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {report.status !== "for_inspection" && (
          <button
            type="button"
            onClick={() => setReportStatus(report.id, "for_inspection")}
            className="h-9 rounded-lg border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Send to inspection
          </button>
        )}
        <button
          type="button"
          onClick={() => setReportStatus(report.id, "resolved")}
          className="h-9 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Mark resolved
        </button>
      </div>
    </li>
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
