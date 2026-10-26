import { BARANGAY_BOUNDARIES } from "./barangay-boundaries";

export const VERIFY_THRESHOLD = 3;
export const REJECT_THRESHOLD = 3;
export const RESOLVE_THRESHOLD = 3;
export const RECENTLY_RESOLVED_DAYS = 7;
export const DUPLICATE_RADIUS_METERS = 40;

export const AREAS = [
  "Barangay 176-A",
  "Barangay 176-B",
  "Barangay 176-C",
  "Barangay 176-D",
  "Barangay 176-E",
  "Barangay 176-F",
] as const;
export type Area = (typeof AREAS)[number];

export const SEVERITIES = ["high", "moderate", "minor"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABEL: Record<Severity, string> = {
  high: "Emergency",
  moderate: "Moderate",
  minor: "Minor",
};

export const HAZARD_TYPES = [
  { id: "pothole", label: "Pothole", severity: "moderate" },
  { id: "flooded-road", label: "Flooded road", severity: "high" },
  { id: "broken-streetlight", label: "Broken streetlight", severity: "moderate" },
  { id: "fallen-tree", label: "Fallen tree or branch", severity: "high" },
  { id: "open-manhole", label: "Open manhole", severity: "high" },
  { id: "damaged-sidewalk", label: "Damaged sidewalk", severity: "minor" },
  { id: "garbage-blocking", label: "Garbage blocking the road", severity: "minor" },
  { id: "broken-traffic-sign", label: "Broken traffic sign", severity: "moderate" },
  { id: "blocked-pedestrian-lane", label: "Blocked pedestrian lane", severity: "minor" },
  { id: "other", label: "Other", severity: "minor" },
] as const satisfies ReadonlyArray<{ id: string; label: string; severity: Severity }>;

export type HazardTypeId = (typeof HAZARD_TYPES)[number]["id"];

export interface HazardType {
  id: HazardTypeId;
  label: string;
  severity: Severity;
}

export const HAZARD_STATUSES = [
  "pending",
  "verified",
  "resolved",
  "rejected",
] as const;
export type HazardStatus = (typeof HAZARD_STATUSES)[number];

export const STATUS_LABEL: Record<HazardStatus, string> = {
  pending: "Pending verification",
  verified: "Verified",
  resolved: "Recently resolved",
  rejected: "Rejected",
};

export const COLORS = {
  high: "#E63B3B",
  moderate: "#F5782A",
  minor: "#F6C620",
  pending: "#8A949E",
  rejected: "#2A2F36",
  resolved: "#4FA784",
  picked: "#0B7A5C",
} as const;

export const BOUNDARY_NOTE = "Approximate OpenStreetMap-informed mock boundaries for demonstration only; not official barangay limits.";
export const APPROXIMATE_BOUNDARIES: Record<Area, LatLngLiteral[]> = Object.fromEntries(
  BARANGAY_BOUNDARIES.map(({ area, coordinates }) => [
    area,
    coordinates[0].map(([lng, lat]) => ({ lat, lng })),
  ]),
) as Record<Area, LatLngLiteral[]>;

export function findAreaAtLocation(point: LatLngLiteral): Area | null {
  for (const area of AREAS) {
    const polygon = APPROXIMATE_BOUNDARIES[area];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[j];
      const b = polygon[i];
      const cross = (point.lng - a.lng) * (b.lat - a.lat) - (point.lat - a.lat) * (b.lng - a.lng);
      const onSegment = Math.abs(cross) < 1e-10 &&
        point.lng >= Math.min(a.lng, b.lng) && point.lng <= Math.max(a.lng, b.lng) &&
        point.lat >= Math.min(a.lat, b.lat) && point.lat <= Math.max(a.lat, b.lat);
      if (onSegment) return area;
      if ((a.lat > point.lat) !== (b.lat > point.lat) &&
        point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng) {
        inside = !inside;
      }
    }
    if (inside) return area;
  }
  return null;
}

export interface AreaSummary {
  total: number;
  pending: number;
  verified: number;
  resolved: number;
  mostCommon: string;
}

export function formatReportedAt(iso: string) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export interface HazardReport {
  id: string;
  typeId: HazardTypeId;
  description: string;
  area: Area;
  lat: number;
  lng: number;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  resolutionConfirmations: number;
  resolvedAt: string | null;
  status: HazardStatus;
}

export type VoteDirection = "up" | "down";

export function getHazardType(id: HazardTypeId): HazardType {
  const type = HAZARD_TYPES.find((item) => item.id === id);
  if (!type) throw new Error(`Unknown hazard type: ${id}`);
  return type;
}

export function isActiveStatus(status: HazardStatus) {
  return status === "verified";
}

export function isOpenStatus(status: HazardStatus) {
  return status === "pending" || isActiveStatus(status);
}

export function markerColor(report: HazardReport) {
  if (report.status === "pending") return COLORS.pending;
  if (report.status === "rejected") return COLORS.rejected;
  if (report.status === "resolved") return COLORS.resolved;
  return COLORS[getHazardType(report.typeId).severity];
}

export function resolveStatus(
  report: Pick<HazardReport, "status" | "upvotes" | "downvotes">,
): HazardStatus {
  if (report.status === "resolved" || report.status === "rejected") return report.status;
  if (report.downvotes - report.upvotes >= REJECT_THRESHOLD) {
    return "rejected";
  }
  if (report.status === "pending" && report.upvotes - report.downvotes >= VERIFY_THRESHOLD) {
    return "verified";
  }
  return report.status;
}

export function applyVote(report: HazardReport, direction: VoteDirection): HazardReport {
  if (report.status !== "pending") return report;
  const upvotes = report.upvotes + (direction === "up" ? 1 : 0);
  const downvotes = report.downvotes + (direction === "down" ? 1 : 0);
  const status = resolveStatus({ status: report.status, upvotes, downvotes });
  return { ...report, upvotes, downvotes, status };
}

export function applyResolutionConfirmation(report: HazardReport): HazardReport {
  if (report.status !== "verified") return report;
  const resolutionConfirmations = report.resolutionConfirmations + 1;
  const resolved = resolutionConfirmations >= RESOLVE_THRESHOLD;
  return {
    ...report,
    resolutionConfirmations,
    status: resolved ? "resolved" : "verified",
    resolvedAt: resolved ? new Date().toISOString() : report.resolvedAt,
  };
}

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const earthRadius = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

export function findDuplicate(
  reports: HazardReport[],
  candidate: Pick<HazardReport, "typeId" | "lat" | "lng">,
) {
  return reports.find(
    (report) =>
      report.status === "pending" &&
      report.typeId === candidate.typeId &&
      distanceMeters(report, candidate) <= DUPLICATE_RADIUS_METERS,
  );
}

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export const DEFAULT_CENTER: LatLngLiteral = { lat: 14.776, lng: 121.039 };

export const MAP_BOUNDS: [[number, number], [number, number]] = [
  [14.763, 121.023],
  [14.789, 121.055],
];

function seedReport(
  id: string,
  hoursAgo: number,
  now: number,
  fields: Omit<HazardReport, "id" | "createdAt">,
): HazardReport {
  return {
    id,
    createdAt: new Date(now - hoursAgo * 3600_000).toISOString(),
    ...fields,
  };
}

export function buildSeedReports(now: number): HazardReport[] {
  const centers: Record<Area, LatLngLiteral> = {
    "Barangay 176-A": { lat: 14.7805, lng: 121.045 },
    "Barangay 176-B": { lat: 14.7695, lng: 121.048 },
    "Barangay 176-C": { lat: 14.7695, lng: 121.0385 },
    "Barangay 176-D": { lat: 14.7695, lng: 121.0295 },
    "Barangay 176-E": { lat: 14.7805, lng: 121.0385 },
    "Barangay 176-F": { lat: 14.7805, lng: 121.0295 },
  };
  const types: HazardTypeId[] = [
    "pothole", "flooded-road", "garbage-blocking", "broken-streetlight", "pothole",
    "damaged-sidewalk", "open-manhole", "fallen-tree", "flooded-road", "broken-traffic-sign",
  ];
  const descriptions: Record<HazardTypeId, string> = {
    pothole: "Pothole reported along a residential road.",
    "flooded-road": "Water collects on the road after heavy rain.",
    "broken-streetlight": "Streetlight is not working after dark.",
    "fallen-tree": "Fallen branch partly blocks the footpath.",
    "open-manhole": "Manhole cover appears loose or missing.",
    "damaged-sidewalk": "Uneven sidewalk may be difficult to pass.",
    "garbage-blocking": "Uncollected waste narrows the roadside path.",
    "broken-traffic-sign": "Traffic sign is damaged or difficult to read.",
    "blocked-pedestrian-lane": "Pedestrian lane is blocked by an obstruction.",
    other: "Community member reported a street hazard.",
  };
  const daysAgo = [1, 3, 5, 7, 9, 12, 16, 20, 23, 27];
  const statuses: HazardStatus[] = [
    "pending", "verified", "pending", "rejected", "verified",
    "pending", "verified", "resolved", "pending", "verified",
  ];

  return AREAS.flatMap((area, areaIndex) =>
    types.map((_, index) => {
      const typeId = types[(index + areaIndex) % types.length];
      const status = statuses[index];
      const center = centers[area];
      const lat = center.lat + ((index % 3) - 1) * 0.0007;
      const lng = center.lng + ((index % 4) - 1.5) * 0.0007;
      return seedReport(`mock-${area.slice(-1)}-${index + 1}`, daysAgo[index] * 24, now, {
        typeId,
        description: descriptions[typeId],
        area,
        lat,
        lng,
        upvotes: status === "verified" ? 5 : status === "resolved" ? 4 : status === "rejected" ? 0 : index % 2,
        downvotes: status === "rejected" ? 3 : status === "verified" ? 1 : 0,
        resolutionConfirmations: status === "resolved" ? RESOLVE_THRESHOLD : status === "verified" ? index % RESOLVE_THRESHOLD : 0,
        resolvedAt: status === "resolved" ? new Date(now - 18 * 3600_000).toISOString() : null,
        status,
      });
    }),
  );
}
