import { ThumbsDown, ThumbsUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/hazards/HazardCard";
import { RESOLVE_THRESHOLD, formatReportedAt, getHazardType, type HazardReport, type VoteDirection } from "@/lib/hazards";

interface HazardDetailsDialogProps {
  report: HazardReport | null;
  myVote?: VoteDirection;
  hasConfirmedResolution?: boolean;
  onVote: (reportId: string, direction: VoteDirection) => void;
  onConfirmResolved: (reportId: string) => void;
  onClose: () => void;
}

export function HazardDetailsDialog({ report, myVote, hasConfirmedResolution, onVote, onConfirmResolved, onClose }: HazardDetailsDialogProps) {
  const votingClosed = Boolean(myVote) || report?.status !== "pending";

  return (
    <Dialog open={report !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        overlayClassName="bg-black/10"
        className="!fixed !left-auto !right-0 !top-16 !bottom-0 !h-auto !w-[min(420px,100vw)] !max-w-none !translate-x-0 !translate-y-0 grid-cols-1 gap-0 overflow-hidden rounded-none border-l p-0 shadow-2xl max-[768px]:!top-auto max-[768px]:!bottom-0 max-[768px]:!left-0 max-[768px]:!right-0 max-[768px]:!h-[70dvh] max-[768px]:!w-full max-[768px]:!max-h-[70dvh] max-[768px]:rounded-t-2xl max-[768px]:rounded-l-none"
      >
        {report && (
          <div className="flex min-h-0 flex-col">
            <DialogHeader className="shrink-0 space-y-2 border-b p-5 pr-14 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={report.status} />
                <span className="text-xs font-semibold text-muted-foreground">{report.area}</span>
              </div>
              <DialogTitle className="text-xl font-extrabold tracking-tight">
                {getHazardType(report.typeId).label}
              </DialogTitle>
              <DialogDescription>Reported {formatReportedAt(report.createdAt)}</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
              <p className="text-sm leading-relaxed">{report.description}</p>
              <section aria-label="Community status" className="rounded-xl border bg-muted/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Community status</p>
                <p className="mt-2 text-sm font-semibold">{report.upvotes} upvotes · {report.downvotes} downvotes</p>
                {report.status === "verified" && <p className="mt-1 text-sm text-muted-foreground">Resolved confirmations: {report.resolutionConfirmations}/{RESOLVE_THRESHOLD}</p>}
                {report.status === "resolved" && <p className="mt-1 text-sm text-muted-foreground">Resolved {report.resolutionConfirmations} community confirmations.</p>}
              </section>
              {report.status === "pending" && (
                <div className="flex gap-2">
                  <button type="button" disabled={votingClosed} onClick={() => onVote(report.id, "up")} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-200 font-semibold text-emerald-800 disabled:opacity-50">
                    <ThumbsUp className="h-4 w-4" aria-hidden="true" /> Upvote
                  </button>
                  <button type="button" disabled={votingClosed} onClick={() => onVote(report.id, "down")} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-rose-200 font-semibold text-rose-800 disabled:opacity-50">
                    <ThumbsDown className="h-4 w-4" aria-hidden="true" /> Downvote
                  </button>
                </div>
              )}
              {report.status === "verified" && (
                <button type="button" disabled={hasConfirmedResolution} onClick={() => onConfirmResolved(report.id)} className="h-11 w-full rounded-lg border border-teal-200 font-semibold text-teal-800 disabled:opacity-50">
                  {hasConfirmedResolution ? "You confirmed this hazard is resolved" : "Confirm Resolved"}
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
