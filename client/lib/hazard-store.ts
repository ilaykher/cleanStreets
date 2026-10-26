import { useSyncExternalStore } from "react";
import {
  applyVote,
  findDuplicate,
  type HazardReport,
  type HazardTypeId,
  type VoteDirection,
  type Area,
  DEFAULT_HAZARD_FILTERS,
  type HazardFilters,
} from "./hazards";
import { barangayAt } from "./barangay-boundaries";
import { buildMockReports } from "./mock-reports";

interface StoreState {
  reports: HazardReport[];
  myVotes: Record<string, VoteDirection>;
  myResolutions: string[];
  filters: HazardFilters;
}

const STORAGE_KEY = "cleanstreets:v7";
const listeners = new Set<() => void>();

function persist(next: StoreState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function load(): StoreState {
  window.localStorage.removeItem("cleanstreets:v4");
  const currentRaw = window.localStorage.getItem(STORAGE_KEY);
  const raw = currentRaw ?? window.localStorage.getItem("cleanstreets:v6") ?? window.localStorage.getItem("cleanstreets:v5");
  if (raw) {
    try {
      const saved = JSON.parse(raw) as Partial<StoreState>;
      if (Array.isArray(saved.reports) && saved.myVotes) {
        const savedMocks = saved.reports.filter((report) => report.id.startsWith("mock-"));
        const mocksAreValid = savedMocks.length === 100 && savedMocks.every((report) => barangayAt(report) === report.area);
        const reports = mocksAreValid && currentRaw ? saved.reports : buildMockReports();
        const reportIds = new Set(reports.map((report) => report.id));
        const clean: StoreState = {
          reports,
          myVotes: Object.fromEntries(Object.entries(saved.myVotes).filter(([id]) => reportIds.has(id))),
          myResolutions: (saved.myResolutions ?? []).filter((id) => reportIds.has(id)),
          filters: saved.filters ?? DEFAULT_HAZARD_FILTERS,
        };
        persist(clean);
        return clean;
      }
    } catch { /* Start empty when local data is invalid. */ }
  }
  const initial: StoreState = { reports: buildMockReports(), myVotes: {}, myResolutions: [], filters: DEFAULT_HAZARD_FILTERS };
  persist(initial);
  return initial;
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
  area: Area;
  lat: number;
  lng: number;
}

export function submitReport(input: NewReportInput, reportAnyway = false): { reportId: string; duplicateId?: string } {
  if (barangayAt(input) !== input.area) return { reportId: "" };
  const duplicate = reportAnyway ? undefined : findDuplicate(state.reports, input);
  if (duplicate) return { reportId: "", duplicateId: duplicate.id };

  const report: HazardReport = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    upvotes: 0,
    downvotes: 0,
    status: "pending",
  };
  update({ ...state, reports: [report, ...state.reports] });
  return { reportId: report.id };
}

export function confirmResolved(reportId: string): boolean {
  const target = state.reports.find((report) => report.id === reportId);
  if (!target || target.status !== "verified" || state.myResolutions.includes(reportId)) return false;
  const resolutionConfirms = (target.resolutionConfirms ?? 0) + 1;
  update({
    ...state,
    reports: state.reports.map((report) => report.id === reportId
      ? { ...report, resolutionConfirms, status: resolutionConfirms >= 3 ? "resolved" as const : report.status }
      : report),
    myResolutions: [...state.myResolutions, reportId],
  });
  return true;
}

export function castVote(reportId: string, direction: VoteDirection): boolean {
  const target = state.reports.find((report) => report.id === reportId);
  if (!target || target.status === "rejected" || target.status === "resolved") return false;

  const reports = state.reports.flatMap((report) => {
    if (report.id !== reportId) return [report];
    const voted = applyVote(report, direction);
    return voted.status === "rejected" ? [] : [voted];
  });
  update({
    ...state,
    reports,
    myVotes: reports.some((report) => report.id === reportId)
      ? { ...state.myVotes, [reportId]: direction }
      : Object.fromEntries(Object.entries(state.myVotes).filter(([id]) => id !== reportId)),
  });
  return true;
}

export function setHazardFilters(filters: HazardFilters) {
  update({ ...state, filters });
}
