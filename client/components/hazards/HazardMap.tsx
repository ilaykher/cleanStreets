import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BARANGAY_BOUNDARIES } from "@/lib/barangay-boundaries";
import {
  COLORS,
  HAZARD_STATUSES,
  MAP_BOUNDS,
  STATUS_LABEL,
  formatReportedAt,
  getHazardType,
  isOpenStatus,
  markerColor,
  type Area,
  type HazardReport,
  type HazardStatus,
  type LatLngLiteral,
  type VoteDirection,
} from "@/lib/hazards";

interface HazardMapProps {
  reports: HazardReport[];
  onVote: (reportId: string, direction: VoteDirection) => void;
  onResolve: (reportId: string) => void;
  myResolutions: string[];
  selectedReportId: string | null;
  selectedReportRequest: number;
  pickMode: boolean;
  pickedLocation: LatLngLiteral | null;
  onPickLocation: (location: LatLngLiteral) => void;
}

function buildPopupContent(
  report: HazardReport,
  onVote: (reportId: string, direction: VoteDirection) => void,
  onResolve: (reportId: string) => void,
  resolvedByMe: boolean,
) {
  const root = document.createElement("div");
  root.className = "w-[240px] max-w-full space-y-1 font-sans text-slate-900";

  const addText = (className: string, text: string) => {
    const el = document.createElement("p");
    el.className = className;
    el.textContent = text;
    root.appendChild(el);
  };

  addText("text-[11px] font-bold uppercase tracking-wide text-slate-500", getHazardType(report.typeId).label);
  addText("mt-1 text-sm font-semibold leading-snug", report.description);
  addText("mt-1 text-xs text-slate-500", `${report.area} · ${formatReportedAt(report.createdAt)}`);
  addText("mt-2 text-xs font-bold text-slate-800", `Status: ${report.status[0].toUpperCase()}${report.status.slice(1)}`);
  addText("text-xs text-slate-600", `Upvotes ${report.upvotes} · Downvotes ${report.downvotes}`);
  addText("text-xs text-slate-600", report.status === "verified"
    ? `Verified ${Math.min(2, report.upvotes)}/3 upvotes`
    : report.status === "resolved"
      ? `Resolved ${report.resolutionConfirms ?? 3}/3 confirmations`
      : `Pending ${report.upvotes + report.downvotes}/3 votes`);

  const row = document.createElement("div");
  row.className = "mt-3 flex gap-2";
  const votingClosed = report.status === "rejected" || report.status === "resolved";

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
  if (report.status === "verified") {
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = resolvedByMe;
    button.textContent = `Confirm Resolved (${report.resolutionConfirms ?? 0}/3)`;
    button.className = "mt-2 h-8 w-full rounded-md border text-xs font-semibold disabled:opacity-50";
    button.addEventListener("click", () => onResolve(report.id));
    root.appendChild(button);
  }
  return root;
}

function barangayCounts(area: Area, reports: HazardReport[]) {
  const counts = Object.fromEntries(HAZARD_STATUSES.map((status) => [status, 0])) as Record<
    HazardStatus,
    number
  >;
  reports.forEach((report) => {
    if (report.area === area) counts[report.status] += 1;
  });
  const open = HAZARD_STATUSES.filter(isOpenStatus).reduce((sum, status) => sum + counts[status], 0);
  return { counts, open };
}

function buildBarangayPopup(area: Area, reports: HazardReport[]) {
  const { counts, open } = barangayCounts(area, reports);
  const root = document.createElement("div");
  root.className = "w-[220px] font-sans text-slate-900";

  const title = document.createElement("p");
  title.className = "text-sm font-extrabold";
  title.textContent = area;

  const summary = document.createElement("p");
  summary.className = "mt-0.5 text-xs text-slate-500";
  summary.textContent = `${open} open hazard${open === 1 ? "" : "s"}`;
  const popular = reports.filter((report) => report.area === area).reduce<Record<string, number>>((counts, report) => {
    counts[report.typeId] = (counts[report.typeId] ?? 0) + 1;
    return counts;
  }, {});
  const mostCommon = Object.entries(popular).sort((a, b) => b[1] - a[1])[0];
  const common = document.createElement("p");
  common.className = "mt-2 text-xs text-slate-600";
  common.textContent = `Most reported: ${mostCommon ? getHazardType(mostCommon[0] as HazardReport["typeId"]).label : "None yet"}`;

  const list = document.createElement("ul");
  list.className = "mt-2 space-y-1 text-xs";
  HAZARD_STATUSES.forEach((status) => {
    const item = document.createElement("li");
    item.className = "flex justify-between gap-3";
    const label = document.createElement("span");
    label.textContent = STATUS_LABEL[status];
    const value = document.createElement("span");
    value.className = "font-bold tabular-nums";
    value.textContent = String(counts[status]);
    item.append(label, value);
    list.appendChild(item);
  });

  root.append(title, summary, list, common);
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
    { color: COLORS.high, label: "Verified: high severity" },
    { color: COLORS.moderate, label: "Verified: moderate severity" },
    { color: COLORS.minor, label: "Verified: minor severity" },
    { color: COLORS.pending, label: "Pending verification" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-4 border border-dashed border-emerald-700" aria-hidden="true" />
        Barangay outline (hover for counts)
      </li>
      <li>Resolved hazards are removed from the public map.</li>
      <li>Rejected reports are hidden from the public map.</li>
    </ul>
  );
}

export default function HazardMap({
  reports,
  onVote,
  onResolve,
  myResolutions,
  selectedReportId,
  selectedReportRequest,
  pickMode,
  pickedLocation,
  onPickLocation,
}: HazardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.CircleMarker>());
  const barangayLayersRef = useRef<{ area: Area; polygon: L.Polygon }[]>([]);
  const pickedMarkerRef = useRef<L.CircleMarker | null>(null);
  const openReportIdRef = useRef<string | null>(null);

  const reportsRef = useRef(reports);
  const onVoteRef = useRef(onVote);
  const onResolveRef = useRef(onResolve);
  const myResolutionsRef = useRef(myResolutions);
  const pickModeRef = useRef(pickMode);
  const onPickRef = useRef(onPickLocation);
  reportsRef.current = reports;
  onVoteRef.current = onVote;
  onResolveRef.current = onResolve;
  myResolutionsRef.current = myResolutions;
  pickModeRef.current = pickMode;
  onPickRef.current = onPickLocation;

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      minZoom: 13,
      maxBounds: MAP_BOUNDS,
      maxBoundsViscosity: 1,
      zoomControl: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.fitBounds(MAP_BOUNDS);

    barangayLayersRef.current = BARANGAY_BOUNDARIES.map(({ area, ring }) => {
      const polygon = L.polygon(
        ring.map(([lat, lng]) => L.latLng(lat, lng)),
        {
          color: COLORS.picked,
          weight: 2,
          dashArray: "6 4",
          fillColor: COLORS.picked,
          fillOpacity: 0.06,
          interactive: true,
          bubblingMouseEvents: true,
        },
      );
      polygon.bindTooltip(buildBarangayPopup(area, []), {
        direction: "top",
        sticky: true,
        opacity: 1,
        className: "barangay-label",
      });
      polygon.on("mouseover", () => { if (!openReportIdRef.current) polygon.openTooltip(); });
      polygon.on("mouseout", () => polygon.closeTooltip());
      polygon.addTo(map);
      return { area, polygon };
    });

    map.on("click", (event) => {
      if (pickModeRef.current) {
        onPickRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
      }
    });
    map.on("popupclose", () => {
      openReportIdRef.current = null;
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      barangayLayersRef.current = [];
      markersRef.current.clear();
      pickedMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();
    reports.filter((report) => report.status === "pending" || report.status === "verified").forEach((report) => {
      seen.add(report.id);
      const existing = markersRef.current.get(report.id);
      if (existing) {
        existing.setStyle(reportMarkerStyle(report));
        return;
      }
      const marker = L.circleMarker([report.lat, report.lng], reportMarkerStyle(report)).addTo(map);
      marker.bindPopup("", {
        minWidth: 240,
        maxWidth: Math.min(340, window.innerWidth - 40),
        maxHeight: 250,
        autoPan: true,
        keepInView: true,
        autoPanPaddingTopLeft: [20, 90],
        autoPanPaddingBottomRight: [20, 20],
      });
      marker.on("click", (event) => {
        if (!pickModeRef.current) L.DomEvent.stopPropagation(event);
        openReport(report.id);
      });
      markersRef.current.set(report.id, marker);
    });

    markersRef.current.forEach((marker, id) => {
      if (seen.has(id)) return;
      marker.remove();
      markersRef.current.delete(id);
    });

    barangayLayersRef.current.forEach(({ area, polygon }) => {
      polygon.setTooltipContent(buildBarangayPopup(area, reports));
    });

    refreshOpenReport();
  }, [reports]);

  useEffect(() => {
    if (selectedReportId) openReport(selectedReportId);
  }, [selectedReportId, selectedReportRequest]);

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
    marker.setPopupContent(buildPopupContent(report, onVoteRef.current, onResolveRef.current, myResolutionsRef.current.includes(reportId)));
    marker.openPopup();
    openReportIdRef.current = reportId;
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
    marker.setPopupContent(buildPopupContent(report, onVoteRef.current, onResolveRef.current, myResolutionsRef.current.includes(openId)));
  }

  return <div ref={containerRef} className="h-full min-h-[420px] w-full" />;
}
