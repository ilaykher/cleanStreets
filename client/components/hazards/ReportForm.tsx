import { useState, type FormEvent } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { barangayAt } from "@/lib/barangay-boundaries";
import { castVote, submitReport } from "@/lib/hazard-store";
import { HAZARD_TYPES, type HazardTypeId, type LatLngLiteral } from "@/lib/hazards";

interface ReportFormProps {
  location: LatLngLiteral | null;
  onSubmitted: (result: { merged: boolean }) => void;
  onCancel: () => void;
}

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

export function ReportForm({ location, onSubmitted, onCancel }: ReportFormProps) {
  const [typeId, setTypeId] = useState<HazardTypeId>("pothole");
  const [description, setDescription] = useState("");
  const [duplicateId, setDuplicateId] = useState<string | null>(null);

  const area = location ? barangayAt(location) : null;
  const canSubmit = Boolean(area) && description.trim().length >= 8;

  function createReport(reportAnyway = false) {
    if (!location || !area || !canSubmit) return;
    const result = submitReport({
      typeId,
      area,
      description: description.trim(),
      lat: location.lat,
      lng: location.lng,
    }, reportAnyway);
    if (result.duplicateId) { setDuplicateId(result.duplicateId); return; }
    setDescription("");
    setDuplicateId(null);
    onSubmitted({ merged: false });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createReport();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <MapPin className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="text-sm">
          {!location && <p className="font-medium">Click the map where the hazard is.</p>}
          {location && area && (
            <>
              <p className="font-bold">{area}</p>
              <p className="text-xs text-muted-foreground">
                Detected from the pinned spot ({location.lat.toFixed(5)}, {location.lng.toFixed(5)})
              </p>
            </>
          )}
          {location && !area && (
            <p className="font-medium text-rose-700">
              Please choose a location inside Bagong Silang.
            </p>
          )}
        </div>
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

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-11 flex-1 rounded-lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit} className="h-11 flex-1 rounded-lg font-bold">
          Submit report
        </Button>
      </div>
      {duplicateId && (
        <div role="alert" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <p>A similar hazard was reported nearby. Do you want to upvote the existing report instead?</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => { castVote(duplicateId, "up"); onSubmitted({ merged: true }); }}>
              Upvote existing report
            </Button>
            <Button type="button" variant="outline" onClick={() => createReport(true)}>Report anyway</Button>
          </div>
        </div>
      )}
    </form>
  );
}
