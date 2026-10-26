export const VERIFY_THRESHOLD = 2;
export const REJECT_THRESHOLD = 2;
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

export const HAZARD_STATUSES = ["pending", "verified", "rejected", "resolved"] as const;
export type HazardStatus = (typeof HAZARD_STATUSES)[number];
export type HazardFilters = {
  typeId: HazardTypeId | "all";
  status: HazardStatus | "all";
  severity: Severity | "all";
};
export const DEFAULT_HAZARD_FILTERS: HazardFilters = { typeId: "all", status: "all", severity: "all" };

export const STATUS_LABEL: Record<HazardStatus, string> = {
  pending: "Pending verification",
  verified: "Verified",
  rejected: "Rejected",
  resolved: "Resolved",
};

export const COLORS = {
  high: "#E63B3B",
  moderate: "#F5782A",
  minor: "#F6C620",
  pending: "#8A949E",
  rejected: "#2A2F36",
  picked: "#0B7A5C",
} as const;

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
  status: HazardStatus;
  resolutionConfirms?: number;
}

export type VoteDirection = "up" | "down";

export function getHazardType(id: HazardTypeId): HazardType {
  const type = HAZARD_TYPES.find((item) => item.id === id);
  if (!type) throw new Error(`Unknown hazard type: ${id}`);
  return type;
}

export function filterReports(reports: HazardReport[], filters: HazardFilters) {
  return reports.filter((report) =>
    (filters.typeId === "all" || report.typeId === filters.typeId) &&
    (filters.status === "all" || report.status === filters.status) &&
    (filters.severity === "all" || getHazardType(report.typeId).severity === filters.severity),
  );
}

export function isOpenStatus(status: HazardStatus) {
  return status === "pending" || status === "verified";
}

export function markerColor(report: HazardReport) {
  if (report.status === "pending") return COLORS.pending;
  if (report.status === "rejected") return COLORS.rejected;
  return COLORS[getHazardType(report.typeId).severity];
}

export function resolveStatus(
  report: Pick<HazardReport, "status" | "upvotes" | "downvotes">,
): HazardStatus {
  if (report.status === "rejected" || report.status === "resolved") return report.status;
  if (report.downvotes >= REJECT_THRESHOLD) return "rejected";
  if (report.upvotes >= VERIFY_THRESHOLD && report.upvotes > report.downvotes) return "verified";
  return report.status;
}

export function applyVote(report: HazardReport, direction: VoteDirection): HazardReport {
  const upvotes = report.upvotes + (direction === "up" ? 1 : 0);
  const downvotes = report.downvotes + (direction === "down" ? 1 : 0);
  const status = resolveStatus({ status: report.status, upvotes, downvotes });
  return { ...report, upvotes, downvotes, status };
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
  return reports
    .filter((report) =>
      isOpenStatus(report.status) &&
      report.typeId === candidate.typeId &&
      distanceMeters(report, candidate) <= DUPLICATE_RADIUS_METERS,
    )
    .sort((a, b) => {
      const score = (report: HazardReport) => (report.status === "verified" ? VERIFY_THRESHOLD : 0) + report.upvotes - report.downvotes;
      return score(b) - score(a) || distanceMeters(a, candidate) - distanceMeters(b, candidate);
    })[0];
}

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export const DEFAULT_CENTER: LatLngLiteral = { lat: 14.7751, lng: 121.0448 };

export const MAP_BOUNDS: [[number, number], [number, number]] = [
  [14.7625, 121.0215],
  [14.7885, 121.0665],
];

