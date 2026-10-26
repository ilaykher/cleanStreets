import { useSyncExternalStore } from "react";
import {
  applyVote,
  findDuplicate,
  type HazardReport,
  type HazardTypeId,
  type VoteDirection,
  type Area,
} from "./hazards";
import { barangayAt } from "./barangay-boundaries";
import { buildMockReports } from "./mock-reports";

interface StoreState {
  reports: HazardReport[];
  myVotes: Record<string, VoteDirection>;
  myResolutions: string[];
}

const STORAGE_KEY = "cleanstreets:v5";
const listeners = new Set<() => void>();

function persist(next: StoreState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function load(): StoreState {
  window.localStorage.removeItem("cleanstreets:v4");
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw) as Partial<StoreState>;
      if (Array.isArray(saved.reports) && saved.myVotes) {
        const savedMocks = saved.reports.filter((report) => report.id.startsWith("mock-"));
        const mocksAreValid = savedMocks.length === 100 && savedMocks.every((report) => barangayAt(report) === report.area);
        const userReports = saved.reports.filter((report) => !report.id.startsWith("mock-") && !report.id.startsWith("seed-"));
        const reports = mocksAreValid
          ? [...savedMocks, ...userReports]
          : [...buildMockReports(), ...userReports];
        const reportIds = new Set(reports.map((report) => report.id));
        const clean: StoreState = {
          reports,
          myVotes: Object.fromEntries(Object.entries(saved.myVotes).filter(([id]) => reportIds.has(id) && (mocksAreValid || !id.startsWith("mock-")))),
          myResolutions: (saved.myResolutions ?? []).filter((id) => reportIds.has(id) && (mocksAreValid || !id.startsWith("mock-"))),
        };
        persist(clean);
        return clean;
      }
    } catch { /* Start empty when local data is invalid. */ }
  }
  const initial: StoreState = { reports: buildMockReports(), myVotes: {}, myResolutions: [] };
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
  if (state.myVotes[reportId]) return false;
  const target = state.reports.find((report) => report.id === reportId);
  if (!target) return false;

  update({
    ...state,
    reports: state.reports.map((report) =>
      report.id === reportId ? applyVote(report, direction) : report,
    ),
    myVotes: { ...state.myVotes, [reportId]: direction },
  });
  return true;
}
