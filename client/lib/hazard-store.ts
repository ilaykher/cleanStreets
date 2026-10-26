import { useSyncExternalStore } from "react";
import {
  applyVote,
  applyResolutionConfirmation,
  buildSeedReports,
  findAreaAtLocation,
  findDuplicate,
  type HazardReport,
  type HazardStatus,
  type HazardTypeId,
  type VoteDirection,
} from "./hazards";

interface StoreState {
  reports: HazardReport[];
  myVotes: Record<string, VoteDirection>;
  myResolutions: Record<string, true>;
}

const STORAGE_KEY = "cleanstreets:v4";
const listeners = new Set<() => void>();

function persist(next: StoreState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function load(): StoreState {
  const current = window.localStorage.getItem(STORAGE_KEY);
  const raw = current ?? window.localStorage.getItem("cleanstreets:v3") ?? window.localStorage.getItem("cleanstreets:v2");
  if (raw) {
    type SavedReport = Omit<HazardReport, "status" | "resolutionConfirmations" | "resolvedAt"> & {
      status: string;
      resolutionConfirmations?: number;
      resolvedAt?: string | null;
    };
    const saved = JSON.parse(raw) as Omit<Partial<StoreState>, "reports"> & { reports?: SavedReport[] };
    const legacy = !current;
    const oldReports = saved.reports ?? [];
    const userReports = oldReports.filter((report) => !/^(seed|mock)-/.test(report.id));
    const normalize = (report: SavedReport): HazardReport => ({
      ...report,
      status: (report.status === "for_inspection" || report.status === "reopened"
        ? "verified"
        : report.status) as HazardStatus,
      resolutionConfirmations: report.resolutionConfirmations ?? 0,
      resolvedAt: report.resolvedAt ?? (report.status === "resolved" ? report.createdAt : null),
    });
    const next: StoreState = {
      reports: legacy
        ? [...buildSeedReports(Date.now()), ...userReports.map(normalize)]
        : oldReports.map(normalize),
      myVotes: legacy
        ? Object.fromEntries(Object.entries(saved.myVotes ?? {}).filter(([id]) => userReports.some((r) => r.id === id)))
        : saved.myVotes ?? {},
      myResolutions: saved.myResolutions ?? {},
    };
    if (legacy) persist(next);
    return next;
  }
  const seeded = { reports: buildSeedReports(Date.now()), myVotes: {}, myResolutions: {} };
  persist(seeded);
  return seeded;
}

let state: StoreState = load();

function update(next: StoreState) {
  state = next;
  persist(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHazardState() {
  return useSyncExternalStore(subscribe, () => state);
}

export interface NewReportInput {
  typeId: HazardTypeId;
  description: string;
  lat: number;
  lng: number;
}

export function findNearbyDuplicate(input: NewReportInput) {
  return findDuplicate(state.reports, input);
}

export function submitReport(input: NewReportInput, reportAnyway = false): { reportId: string | null; merged: boolean } {
  const area = findAreaAtLocation(input);
  if (!area) return { reportId: null, merged: false };
  const duplicate = reportAnyway ? null : findNearbyDuplicate(input);
  if (duplicate) return { reportId: duplicate.id, merged: true };

  const report: HazardReport = {
    ...input,
    area,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    upvotes: 0,
    downvotes: 0,
    resolutionConfirmations: 0,
    resolvedAt: null,
    status: "pending",
  };
  update({ ...state, reports: [report, ...state.reports] });
  return { reportId: report.id, merged: false };
}

export function castVote(reportId: string, direction: VoteDirection): boolean {
  if (state.myVotes[reportId]) return false;
  const target = state.reports.find((report) => report.id === reportId);
  if (!target || target.status !== "pending") return false;

  update({
    reports: state.reports.map((report) =>
      report.id === reportId ? applyVote(report, direction) : report,
    ),
    myVotes: { ...state.myVotes, [reportId]: direction },
  });
  return true;
}

export function confirmResolved(reportId: string): boolean {
  if (state.myResolutions[reportId]) return false;
  const target = state.reports.find((report) => report.id === reportId);
  if (!target || target.status !== "verified") return false;

  update({
    reports: state.reports.map((report) =>
      report.id === reportId ? applyResolutionConfirmation(report) : report,
    ),
    myVotes: state.myVotes,
    myResolutions: { ...state.myResolutions, [reportId]: true },
  });
  return true;
}
