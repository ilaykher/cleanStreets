import { useState, type FormEvent } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findNearbyDuplicate, submitReport } from "@/lib/hazard-store";
import {
  findAreaAtLocation,
  HAZARD_TYPES,
  type HazardTypeId,
  type LatLngLiteral,
} from "@/lib/hazards";

interface ReportFormProps {
  location: LatLngLiteral | null;
  onSubmitted: (result: { merged: boolean }) => void;
  onUpvoteExisting: (reportId: string) => boolean;
  onCancel: () => void;
}

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

export function ReportForm({ location, onSubmitted, onUpvoteExisting, onCancel }: ReportFormProps) {
  const [typeId, setTypeId] = useState<HazardTypeId>("pothole");
  const [description, setDescription] = useState("");
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState("");

  const area = location ? findAreaAtLocation(location) : null;
  const canSubmit = Boolean(location && area) && description.trim().length >= 8;

  function saveReport(reportAnyway = false) {
    if (!location || !area || !canSubmit) return;
    const result = submitReport({
      typeId,
      description: description.trim(),
      lat: location.lat,
      lng: location.lng,
    }, reportAnyway);
    if (!result.reportId) return;
    setDescription("");
    onSubmitted({ merged: result.merged });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!location || !area || !canSubmit) return;
    const duplicate = findNearbyDuplicate({ typeId, description: description.trim(), lat: location.lat, lng: location.lng });
    if (duplicate) {
      setDuplicateId(duplicate.id);
      setVoteError("");
      return;
    }
    saveReport();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <MapPin className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium">
          {location
            ? `Pinned at ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} · ${area}`
            : "Click the map where the hazard is."}
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Hazard type</span>
        <select className={selectClass} value={typeId} onChange={(e) => setTypeId(e.target.value as HazardTypeId)}>
          {HAZARD_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="What is the hazard and how dangerous is it?"
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {duplicateId ? (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4" role="alert">
          <p className="text-sm font-semibold text-amber-950">A similar hazard was reported nearby. Do you want to upvote the existing report instead?</p>
          {voteError && <p className="text-xs text-rose-700">{voteError}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="h-10 flex-1" onClick={() => {
              if (onUpvoteExisting(duplicateId)) onSubmitted({ merged: true });
              else setVoteError("You have already voted on this report, or it is no longer pending.");
            }}>Upvote existing report</Button>
            <Button type="button" variant="outline" className="h-10 flex-1" onClick={() => saveReport(true)}>Report anyway</Button>
          </div>
        </div>
      ) : <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-11 flex-1 rounded-lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit} className="h-11 flex-1 rounded-lg font-bold">
          Submit report
        </Button>
      </div>}
    </form>
  );
}
