import { useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, MapPin, Plus, X } from "lucide-react";
import HazardMap, { MapLegend } from "@/components/hazards/HazardMap";
import { HazardCard } from "@/components/hazards/HazardCard";
import { HazardDetailsDialog } from "@/components/hazards/HazardDetailsDialog";
import { ReportForm } from "@/components/hazards/ReportForm";
import { castVote, confirmResolved, useHazardState } from "@/lib/hazard-store";
import {
  AREAS,
  HAZARD_TYPES,
  RECENTLY_RESOLVED_DAYS,
  SEVERITY_LABEL,
  SEVERITIES,
  VERIFY_THRESHOLD,
  BOUNDARY_NOTE,
  isActiveStatus,
  type Area,
  type HazardReport,
  type LatLngLiteral,
  type HazardTypeId,
  type Severity,
  type VoteDirection,
  getHazardType,
} from "@/lib/hazards";
import { cn } from "@/lib/utils";

type Tab = "pending" | "verified";

const selectClass =
  "h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function Index() {
  const { reports, myVotes, myResolutions } = useHazardState();
  const [pickMode, setPickMode] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<LatLngLiteral | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [typeFilter, setTypeFilter] = useState<"all" | HazardTypeId>("all");
  const [areaFilter, setAreaFilter] = useState<"all" | Area>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const detailsReport = reports.find((report) => report.id === detailsId) ?? null;

  const matchesFilters = (report: HazardReport) =>
    (typeFilter === "all" || report.typeId === typeFilter) &&
    (areaFilter === "all" || report.area === areaFilter) &&
    (severityFilter === "all" || getHazardType(report.typeId).severity === severityFilter);

  const pendingReports = useMemo(
    () =>
      reports
        .filter((report) => report.status === "pending" && matchesFilters(report))
        .sort((a, b) => b.upvotes - a.upvotes || b.createdAt.localeCompare(a.createdAt)),
    [reports, typeFilter, areaFilter, severityFilter],
  );

  const verifiedReports = useMemo(() => {
    const now = Date.now();
    return reports
        .filter(
          (report) =>
            (isActiveStatus(report.status) ||
              (report.status === "resolved" &&
                now - Date.parse(report.resolvedAt ?? report.createdAt) <= RECENTLY_RESOLVED_DAYS * 86_400_000)) &&
            matchesFilters(report),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [reports, typeFilter, areaFilter, severityFilter]);

  const verifiedCount = reports.filter((report) => isActiveStatus(report.status)).length;
  const pendingCount = reports.filter((report) => report.status === "pending").length;
  const rejectedCount = reports.filter((report) => report.status === "rejected").length;

  const visibleList = tab === "pending" ? pendingReports : verifiedReports;
  const mapReports = reports.filter((report) => report.status === "pending" || report.status === "verified");

  function handleVote(reportId: string, direction: VoteDirection) {
    castVote(reportId, direction);
  }

  function handleConfirmResolved(reportId: string) {
    if (confirmResolved(reportId)) {
      setNotice("Thanks for checking in person. The hazard is removed from the public map after 3 community confirmations.");
    }
  }

  function startReport() {
    setNotice(null);
    setPickError(null);
    setPickedLocation(null);
    setPickMode(true);
  }

  function cancelReport() {
    setPickMode(false);
    setPickedLocation(null);
    setPickError(null);
  }

  function handlePickLocation(location: LatLngLiteral) {
    setPickedLocation(location);
    setPickError(null);
  }

  function handleInvalidPick() {
    setPickedLocation(null);
    setPickError("Please choose a location inside Bagong Silang.");
  }

  function handleSubmitted({ merged }: { merged: boolean }) {
    setPickMode(false);
    setPickedLocation(null);
    setPickError(null);
    setTab("pending");
    setNotice(
      merged
        ? "Your upvote was added to the existing nearby report."
        : `Thanks! Your report is pending. It becomes verified after ${VERIFY_THRESHOLD} net community upvotes.`,
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
              <Stat label="Rejected" value={rejectedCount} tone="text-zinc-700" />
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

      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-16 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <MapLegend />
            <span className="hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:flex">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Marker color shows severity
            </span>
          </div>
          <p className="border-b border-border bg-amber-50 px-5 py-2 text-xs font-medium text-amber-900">
            {BOUNDARY_NOTE}
          </p>
          <div className="relative h-[520px] sm:h-[600px] lg:h-[680px]">
            <HazardMap
              reports={mapReports}
              onSelectReport={setDetailsId}
              pickMode={pickMode}
              pickedLocation={pickedLocation}
              onPickLocation={handlePickLocation}
              onInvalidPick={handleInvalidPick}
            />
            {pickMode && !pickedLocation && (
              <div role="status" className="pointer-events-none absolute left-4 top-4 max-w-[calc(100%-2rem)] rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-card">
                {pickError ?? "Click inside the outlined Bagong Silang area to place your pin."}
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card lg:h-[calc(680px_+_3.5rem)]">
          {pickMode && pickedLocation ? (
            <div className="p-5">
              <h2 className="text-xl font-extrabold tracking-tight">New hazard report</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a location on the map, then describe what you saw.
              </p>
              <div className="mt-5">
                <ReportForm
                  location={pickedLocation}
                  onSubmitted={handleSubmitted}
                  onUpvoteExisting={(id) => castVote(id, "up")}
                  onCancel={cancelReport}
                />
              </div>
            </div>
          ) : pickMode ? (
            <div className="p-5">
              <h2 className="text-xl font-extrabold tracking-tight">Choose a location</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The report form opens after you place a valid pin inside Bagong Silang.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-border p-5 pb-4">
                {notice && (
                  <p className="mb-4 flex items-start justify-between gap-3 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
                    {notice}
                    <button
                      type="button"
                      onClick={() => setNotice(null)}
                      aria-label="Dismiss"
                      className="shrink-0 text-emerald-900/60 hover:text-emerald-900"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </p>
                )}
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                  <TabButton active={tab === "pending"} onClick={() => setTab("pending")}>
                    Pending ({pendingReports.length})
                  </TabButton>
                  <TabButton active={tab === "verified"} onClick={() => setTab("verified")}>
                    Verified & recent ({verifiedReports.length})
                  </TabButton>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <select
                    aria-label="Filter by hazard type"
                    className={selectClass}
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as "all" | HazardTypeId)}
                  >
                    <option value="all">All types</option>
                    {HAZARD_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by area"
                    className={selectClass}
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value as "all" | Area)}
                  >
                    <option value="all">All areas</option>
                    {AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by severity"
                    className={selectClass}
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value as "all" | Severity)}
                  >
                    <option value="all">All severity</option>
                    {SEVERITIES.map((severity) => (
                      <option key={severity} value={severity}>
                        {SEVERITY_LABEL[severity]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
                {visibleList.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    {tab === "pending"
                      ? "No pending reports match these filters."
                      : "No verified hazards match these filters yet."}
                  </p>
                ) : (
                  visibleList.map((report) => (
                    <HazardCard
                      key={report.id}
                      report={report}
                      myVote={myVotes[report.id]}
                      hasConfirmedResolution={Boolean(myResolutions[report.id])}
                      onVote={handleVote}
                      onConfirmResolved={handleConfirmResolved}
                      onDetails={(item) => setDetailsId(item.id)}
                      showVerificationProgress={report.status === "pending"}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16" aria-labelledby="how-it-works-title">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h2 id="how-it-works-title" className="text-xl font-extrabold tracking-tight">How it works</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              "Report a hazard by placing a pin.",
              "Other residents upvote or downvote it.",
              "It becomes verified after three net upvotes.",
              "Verified hazards can be confirmed resolved.",
              "After three resolution confirmations, it is removed from the map.",
            ].map((step, index) => <li key={step} className="flex gap-3 text-sm leading-relaxed text-muted-foreground"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>{step}</li>)}
          </ol>
        </div>
      </section>

      <HazardDetailsDialog
        report={detailsReport}
        myVote={detailsId ? myVotes[detailsId] : undefined}
        hasConfirmedResolution={detailsId ? Boolean(myResolutions[detailsId]) : false}
        onVote={handleVote}
        onConfirmResolved={handleConfirmResolved}
        onClose={() => setDetailsId(null)}
      />
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg text-sm font-bold transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
