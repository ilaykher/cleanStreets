import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/hazards/HazardCard";
import { formatReportedAt, getHazardType, type HazardReport } from "@/lib/hazards";

interface HazardDetailsDialogProps {
  report: HazardReport | null;
  onClose: () => void;
}

export function HazardDetailsDialog({ report, onClose }: HazardDetailsDialogProps) {
  const position = report ? `${report.lat},${report.lng}` : "";

  return (
    <Dialog open={report !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl gap-0 overflow-hidden p-0">
        {report && (
          <>
            <DialogHeader className="space-y-2 p-5 pb-4 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={report.status} />
                <span className="text-xs font-semibold text-muted-foreground">{report.area}</span>
              </div>
              <DialogTitle className="text-xl font-extrabold tracking-tight">
                {getHazardType(report.typeId).label}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Reported {formatReportedAt(report.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <iframe
              title={`Google Maps location of ${getHazardType(report.typeId).label}`}
              src={`https://www.google.com/maps?q=${position}&z=17&output=embed`}
              className="h-[50vh] min-h-[260px] w-full border-0 bg-muted"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />

            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-relaxed text-muted-foreground">{report.description}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${position}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Open in Google Maps
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
