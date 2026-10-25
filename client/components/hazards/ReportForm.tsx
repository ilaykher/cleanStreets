import { useState, type FormEvent } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReport } from "@/lib/hazard-store";
import {
  AREAS,
  HAZARD_TYPES,
  type Area,
  type HazardTypeId,
  type LatLngLiteral,
} from "@/lib/hazards";

interface ReportFormProps {
  location: LatLngLiteral | null;
  onSubmitted: (result: { merged: boolean }) => void;
  onCancel: () => void;
}

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

export function ReportForm({ location, onSubmitted, onCancel }: ReportFormProps) {
  const [typeId, setTypeId] = useState<HazardTypeId>("pothole");
  const [area, setArea] = useState<Area>(AREAS[0]);
  const [description, setDescription] = useState("");

  const canSubmit = Boolean(location) && description.trim().length >= 8;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!location || !canSubmit) return;
    const result = submitReport({
      typeId,
      area,
      description: description.trim(),
      lat: location.lat,
      lng: location.lng,
    });
    setDescription("");
    onSubmitted({ merged: result.merged });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <MapPin className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium">
          {location
            ? `Pinned at ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
            : "Click the map where the hazard is."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Hazard type</span>
          <select className={selectClass} value={typeId} onChange={(e) => setTypeId(e.target.value as HazardTypeId)}>
            {HAZARD_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Area</span>
          <select className={selectClass} value={area} onChange={(e) => setArea(e.target.value as Area)}>
            {AREAS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

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
    </form>
  );
}
