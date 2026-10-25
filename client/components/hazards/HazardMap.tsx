import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  COLORS,
  DEFAULT_CENTER,
  MAP_BOUNDS,
  STATUS_LABEL,
  formatReportedAt,
  getHazardType,
  markerColor,
  type HazardReport,
  type LatLngLiteral,
  type VoteDirection,
} from "@/lib/hazards";

interface HazardMapProps {
  reports: HazardReport[];
  myVotes: Record<string, VoteDirection>;
  onVote: (reportId: string, direction: VoteDirection) => void;
  pickMode: boolean;
  pickedLocation: LatLngLiteral | null;
  onPickLocation: (location: LatLngLiteral) => void;
}

function buildPopupContent(
  report: HazardReport,
  myVote: VoteDirection | undefined,
  onVote: (reportId: string, direction: VoteDirection) => void,
) {
  const root = document.createElement("div");
  root.className = "w-[240px] font-sans text-slate-900";

  const addText = (className: string, text: string) => {
    const el = document.createElement("p");
    el.className = className;
    el.textContent = text;
    root.appendChild(el);
  };

  addText("text-[11px] font-bold uppercase tracking-wide text-slate-500", getHazardType(report.typeId).label);
  addText("mt-1 text-sm font-semibold leading-snug", report.description);
  addText("mt-1 text-xs text-slate-500", `${report.area} · ${formatReportedAt(report.createdAt)}`);
  addText("mt-2 text-xs font-bold text-slate-800", `Status: ${STATUS_LABEL[report.status]}`);
  addText("text-xs text-slate-600", `Upvotes ${report.upvotes} · Downvotes ${report.downvotes}`);

  const row = document.createElement("div");
  row.className = "mt-3 flex gap-2";
  const votingClosed = Boolean(myVote) || report.status === "rejected";

  (["up", "down"] as const).forEach((direction) => {
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = votingClosed;
    button.textContent = direction === "up" ? "Upvote" : "Downvote";
    button.className =
      "h-8 flex-1 rounded-md border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
      (direction === "up"
        ? "border-emerald-300 text-emerald-800 hover:bg-emerald-50"
        : "border-rose-300 text-rose-800 hover:bg-rose-50");
    button.addEventListener("click", () => onVote(report.id, direction));
    row.appendChild(button);
  });
  root.appendChild(row);
  return root;
}

function reportMarkerStyle(report: HazardReport): L.CircleMarkerOptions {
  return {
    radius: 9,
    color: "#ffffff",
    weight: 2,
    fillColor: markerColor(report),
    fillOpacity: report.status === "rejected" ? 0.35 : 1,
  };
}

export function MapLegend() {
  const items = [
    { color: COLORS.high, label: "Emergency" },
    { color: COLORS.moderate, label: "Moderate" },
    { color: COLORS.minor, label: "Minor" },
    { color: COLORS.pending, label: "Pending verification" },
    { color: COLORS.resolved, label: "Resolved" },
    { color: COLORS.rejected, label: "Rejected (faded)" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export default function HazardMap({
  reports,
  myVotes,
  onVote,
  pickMode,
  pickedLocation,
  onPickLocation,
}: HazardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.CircleMarker>());
  const pickedMarkerRef = useRef<L.CircleMarker | null>(null);
  const openReportIdRef = useRef<string | null>(null);

  const reportsRef = useRef(reports);
  const myVotesRef = useRef(myVotes);
  const onVoteRef = useRef(onVote);
  const pickModeRef = useRef(pickMode);
  const onPickRef = useRef(onPickLocation);
  reportsRef.current = reports;
  myVotesRef.current = myVotes;
  onVoteRef.current = onVote;
  pickModeRef.current = pickMode;
  onPickRef.current = onPickLocation;

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      zoom: 16,
      minZoom: 14,
      maxBounds: MAP_BOUNDS,
      maxBoundsViscosity: 1,
      zoomControl: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    map.on("click", (event) => {
      if (pickModeRef.current) {
        onPickRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
      } else {
        map.closePopup();
      }
    });
    map.on("popupclose", () => {
      openReportIdRef.current = null;
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      pickedMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();
    reports.forEach((report) => {
      seen.add(report.id);
      const existing = markersRef.current.get(report.id);
      if (existing) {
        existing.setStyle(reportMarkerStyle(report));
        return;
      }
      const marker = L.circleMarker([report.lat, report.lng], reportMarkerStyle(report)).addTo(map);
      marker.bindPopup("", { minWidth: 240 });
      marker.on("click", () => openReport(report.id));
      markersRef.current.set(report.id, marker);
    });

    markersRef.current.forEach((marker, id) => {
      if (seen.has(id)) return;
      marker.remove();
      markersRef.current.delete(id);
    });

    refreshOpenReport();
  }, [reports, myVotes]);

  useEffect(() => {
    const map = mapRef.current;
    pickedMarkerRef.current?.remove();
    pickedMarkerRef.current = null;
    if (!map || !pickedLocation) return;

    pickedMarkerRef.current = L.circleMarker([pickedLocation.lat, pickedLocation.lng], {
      radius: 10,
      color: "#ffffff",
      weight: 3,
      fillColor: COLORS.picked,
      fillOpacity: 1,
    }).addTo(map);
    map.panTo([pickedLocation.lat, pickedLocation.lng]);
  }, [pickedLocation]);

  useEffect(() => {
    const container = mapRef.current?.getContainer();
    if (container) container.style.cursor = pickMode ? "crosshair" : "";
  }, [pickMode]);

  function openReport(reportId: string) {
    const map = mapRef.current;
    const marker = markersRef.current.get(reportId);
    const report = reportsRef.current.find((item) => item.id === reportId);
    if (!map || !marker || !report) return;

    openReportIdRef.current = reportId;
    marker.setPopupContent(buildPopupContent(report, myVotesRef.current[reportId], onVoteRef.current));
    marker.openPopup();
  }

  function refreshOpenReport() {
    const map = mapRef.current;
    const openId = openReportIdRef.current;
    if (!map || !openId) return;
    const marker = markersRef.current.get(openId);
    const report = reportsRef.current.find((item) => item.id === openId);
    if (!marker || !report) {
      map.closePopup();
      openReportIdRef.current = null;
      return;
    }
    marker.setPopupContent(buildPopupContent(report, myVotesRef.current[openId], onVoteRef.current));
  }

  return <div ref={containerRef} className="h-full min-h-[420px] w-full" />;
}
