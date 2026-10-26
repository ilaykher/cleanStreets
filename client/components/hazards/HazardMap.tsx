import { useEffect, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BAGONG_SILANG_OUTLINE } from "@/lib/barangay-boundaries";
import {
  COLORS,
  DEFAULT_CENTER,
  findAreaAtLocation,
  MAP_BOUNDS,
  markerColor,
  type HazardReport,
  type LatLngLiteral,
} from "@/lib/hazards";

interface HazardMapProps {
  reports: HazardReport[];
  onSelectReport: (reportId: string) => void;
  pickMode: boolean;
  pickedLocation: LatLngLiteral | null;
  onPickLocation: (location: LatLngLiteral) => void;
  onInvalidPick: () => void;
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
  onSelectReport,
  pickMode,
  pickedLocation,
  onPickLocation,
  onInvalidPick,
}: HazardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.CircleMarker>());
  const pickedMarkerRef = useRef<L.CircleMarker | null>(null);

  const onSelectReportRef = useRef(onSelectReport);
  const pickModeRef = useRef(pickMode);
  const onPickRef = useRef(onPickLocation);
  const onInvalidPickRef = useRef(onInvalidPick);
  onSelectReportRef.current = onSelectReport;
  pickModeRef.current = pickMode;
  onPickRef.current = onPickLocation;
  onInvalidPickRef.current = onInvalidPick;

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

    L.polygon(BAGONG_SILANG_OUTLINE.map(([lng, lat]) => [lat, lng] as L.LatLngExpression), {
      color: "#008080",
      dashArray: "5, 5",
      weight: 2,
      fillColor: "#087f5b",
      fillOpacity: 0.035,
      interactive: false,
    }).addTo(map);

    map.on("click", (event) => {
      if (pickModeRef.current) {
        handleLocationPick(event.latlng);
      }
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
      marker.on("click", (event: L.LeafletMouseEvent) => {
        if (pickModeRef.current) {
          handleLocationPick(event.latlng);
        } else onSelectReportRef.current(report.id);
      });
      markersRef.current.set(report.id, marker);
    });

    markersRef.current.forEach((marker, id) => {
      if (seen.has(id)) return;
      marker.remove();
      markersRef.current.delete(id);
    });

  }, [reports]);

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
      interactive: false,
    }).addTo(map);
    map.panTo([pickedLocation.lat, pickedLocation.lng]);
  }, [pickedLocation]);

  useEffect(() => {
    const container = mapRef.current?.getContainer();
    if (container) container.style.cursor = pickMode ? "crosshair" : "";
  }, [pickMode]);

  function handleLocationPick(location: LatLngLiteral) {
    if (findAreaAtLocation(location)) {
      onPickRef.current(location);
      return;
    }
    onInvalidPickRef.current();
  }

  return <div ref={containerRef} className="h-full min-h-[420px] w-full" />;
}
