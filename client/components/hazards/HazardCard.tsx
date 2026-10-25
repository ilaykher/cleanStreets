import { MapPin, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COLORS,
  SEVERITY_LABEL,
  STATUS_LABEL,
  VERIFY_THRESHOLD,
  formatReportedAt,
  getHazardType,
  type HazardReport,
  type HazardStatus,
  type VoteDirection,
} from "@/lib/hazards";

const STATUS_STYLE: Record<HazardStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  verified: "bg-emerald-100 text-emerald-800",
  for_inspection: "bg-amber-100 text-amber-800",
  reopened: "bg-orange-100 text-orange-800",
  resolved: "bg-teal-100 text-teal-800",
  rejected: "bg-zinc-200 text-zinc-700",
};

export function StatusBadge({ status }: { status: HazardStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function SeverityChip({ typeId }: { typeId: HazardReport["typeId"] }) {
  const { severity } = getHazardType(typeId);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: COLORS[severity] }}
        aria-hidden="true"
      />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

interface HazardCardProps {
  report: HazardReport;
  myVote?: VoteDirection;
  onVote: (reportId: string, direction: VoteDirection) => void;
  onDetails?: (report: HazardReport) => void;
  showVerificationProgress?: boolean;
}

export function HazardCard({
  report,
  myVote,
  onVote,
  onDetails,
  showVerificationProgress = false,
}: HazardCardProps) {
  const type = getHazardType(report.typeId);
  const isRejected = report.status === "rejected";
  const votingClosed = Boolean(myVote) || isRejected;
  const progress = Math.min(report.upvotes / VERIFY_THRESHOLD, 1);

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug">{type.label}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{report.area}</p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground/85">{report.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <SeverityChip typeId={report.typeId} />
        <span>Reported {formatReportedAt(report.createdAt)}</span>
      </div>

      {showVerificationProgress && (
        <div className="mt-4">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
            <span>Upvotes</span>
            <span>
              {report.upvotes} / {VERIFY_THRESHOLD} needed
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onVote(report.id, "up")}
          disabled={votingClosed}
          className={cn(
            "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors",
            "border-emerald-200 text-emerald-800 hover:bg-emerald-50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            myVote === "up" && "bg-emerald-100",
          )}
        >
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          Upvote · {report.upvotes}
        </button>
        <button
          type="button"
          onClick={() => onVote(report.id, "down")}
          disabled={votingClosed}
          className={cn(
            "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors",
            "border-rose-200 text-rose-800 hover:bg-rose-50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            myVote === "down" && "bg-rose-100",
          )}
        >
          <ThumbsDown className="h-4 w-4" aria-hidden="true" />
          Downvote · {report.downvotes}
        </button>
      </div>

      {onDetails && (
        <button
          type="button"
          onClick={() => onDetails(report)}
          className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
          Details on map
        </button>
      )}
    </article>
  );
}
