import { useState } from "react";
import { CheckCircle2, MapPin, Plus, X } from "lucide-react";
import HazardMap, { MapLegend } from "@/components/hazards/HazardMap";
import { ReportForm } from "@/components/hazards/ReportForm";
import { castVote, confirmResolved, useHazardState } from "@/lib/hazard-store";
import {
  VERIFY_THRESHOLD,
  type LatLngLiteral,
  type VoteDirection,
  getHazardType,
} from "@/lib/hazards";
import { cn } from "@/lib/utils";
import { barangayAt } from "@/lib/barangay-boundaries";


export default function Index() {
  const { reports, myVotes, myResolutions } = useHazardState();
  const [pickMode, setPickMode] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<LatLngLiteral | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportRequest, setSelectedReportRequest] = useState(0);

  const verifiedCount = reports.filter((report) => report.status === "verified").length;
  const pendingCount = reports.filter((report) => report.status === "pending").length;
  const resolvedCount = reports.filter((report) => report.status === "resolved").length;
  const publicReports = reports.filter((report) =>
    (report.status === "pending" || report.status === "verified") && barangayAt(report) === report.area,
  );

  function openReport(reportId: string) {
    setSelectedReportId(reportId);
    setSelectedReportRequest((request) => request + 1);
  }

  function handleVote(reportId: string, direction: VoteDirection) {
    castVote(reportId, direction);
  }

  function startReport() {
    setNotice(null);
    setPickedLocation(null);
    setPickMode(true);
  }

  function cancelReport() {
    setPickMode(false);
    setPickedLocation(null);
  }

  function handleSubmitted({ merged }: { merged: boolean }) {
    setPickMode(false);
    setPickedLocation(null);
    setNotice(
      merged
        ? "Your upvote was added to the nearby hazard report."
        : `Thanks! Your report is pending. It becomes verified after ${VERIFY_THRESHOLD} upvotes from neighbors.`,
    );
  }

  return (
    <div>
      <section className="mx-auto max-w-7xl px-5 pb-6 pt-8 sm:pt-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Community-verified
            </p>
            <h1 className="mt-4 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Report the hazard. Let neighbors confirm it.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Potholes, flooding, dark streetlights and open manholes appear on the map only after
              enough residents confirm them, so everyone sees what is real.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row lg:flex-col lg:items-end">
            <dl className="grid grid-cols-3 gap-2 text-center sm:gap-3">
              <Stat label="Verified" value={verifiedCount} tone="text-emerald-700" />
              <Stat label="Pending" value={pendingCount} tone="text-slate-600" />
              <Stat label="Resolved" value={resolvedCount} tone="text-emerald-700" />
            </dl>
            {pickMode ? (
              <button
                type="button"
                onClick={cancelReport}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-bold shadow-card transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Cancel report
              </button>
            ) : (
              <button
                type="button"
                onClick={startReport}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-card transition-transform hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Report a hazard
              </button>
            )}
          </div>
        </div>
      </section>

      {notice && <div role="status" className="mx-auto mb-4 flex max-w-7xl items-center justify-between gap-3 px-5 text-sm text-emerald-800"><span>{notice}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button></div>}
      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-16 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <MapLegend />
            <span className="hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:flex">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Marker color shows severity
            </span>
          </div>
          <div className="relative h-[520px] sm:h-[600px] lg:h-[680px]">
            <HazardMap
              reports={publicReports}
              myVotes={myVotes}
              onVote={handleVote}
              onResolve={(id) => confirmResolved(id)}
              myResolutions={myResolutions}
              selectedReportId={selectedReportId}
              selectedReportRequest={selectedReportRequest}
              pickMode={pickMode}
              pickedLocation={pickedLocation}
              onPickLocation={setPickedLocation}
            />
            {pickMode && (
              <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-card">
                Click the map to place your report
              </div>
            )}
          </div>
        </div>

        <aside className="max-h-[560px] overflow-hidden rounded-3xl border border-border bg-card shadow-card lg:h-[736px] lg:max-h-none">
          {pickMode ? <div className="p-5">
            <h2 className="text-xl font-extrabold tracking-tight">New hazard report</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick a location on the map, then describe what you saw.</p>
            <div className="mt-5"><ReportForm location={pickedLocation} onSubmitted={handleSubmitted} onCancel={cancelReport} /></div>
          </div> : <>
            <div className="border-b border-border p-5">
              <h2 className="text-xl font-extrabold tracking-tight">Hazard reports</h2>
              <p className="mt-1 text-sm text-muted-foreground">{publicReports.length} active reports · Select one to view it on the map.</p>
            </div>
            <ul aria-label="Active hazard reports" className="max-h-[470px] divide-y divide-border overflow-y-auto lg:h-[calc(736px-5.5rem)] lg:max-h-none">
              {publicReports.map((report) => <li key={report.id}>
                <button type="button" onClick={() => openReport(report.id)} className="w-full p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold">{getHazardType(report.typeId).label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${report.status === "verified" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{report.status === "verified" ? "Verified" : "Pending"}</span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{report.area}</span>
                  <span className="mt-1 block text-sm text-foreground">{report.description.length > 110 ? `${report.description.slice(0, 107)}…` : report.description}</span>
                </button>
              </li>)}
            </ul>
          </>}
        </aside>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="min-w-[88px] rounded-xl border border-border bg-card px-4 py-2.5 shadow-card">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("text-2xl font-extrabold tabular-nums", tone)}>{value}</dd>
    </div>
  );
}
