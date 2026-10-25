import { useSyncExternalStore } from "react";
import {
  applyVote,
  buildSeedReports,
  findDuplicate,
  type HazardReport,
  type HazardStatus,
  type HazardTypeId,
  type VoteDirection,
  type Area,
} from "./hazards";

interface StoreState {
  reports: HazardReport[];
  myVotes: Record<string, VoteDirection>;
}

const STORAGE_KEY = "cleanstreets:v2";
const listeners = new Set<() => void>();

function persist(next: StoreState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function load(): StoreState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw) as StoreState;
  const seeded = { reports: buildSeedReports(Date.now()), myVotes: {} };
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
  area: Area;
  lat: number;
  lng: number;
}

export function submitReport(input: NewReportInput): { reportId: string; merged: boolean } {
  const duplicate = findDuplicate(state.reports, input);
  if (duplicate) {
    castVote(duplicate.id, "up");
    return { reportId: duplicate.id, merged: true };
  }

  const report: HazardReport = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    upvotes: 0,
    downvotes: 0,
    status: "pending",
  };
  update({ ...state, reports: [report, ...state.reports] });
  return { reportId: report.id, merged: false };
}

export function castVote(reportId: string, direction: VoteDirection): boolean {
  if (state.myVotes[reportId]) return false;
  const target = state.reports.find((report) => report.id === reportId);
  if (!target) return false;

  update({
    reports: state.reports.map((report) =>
      report.id === reportId ? applyVote(report, direction) : report,
    ),
    myVotes: { ...state.myVotes, [reportId]: direction },
  });
  return true;
}

export function setReportStatus(reportId: string, status: HazardStatus) {
  update({
    ...state,
    reports: state.reports.map((report) =>
      report.id === reportId ? { ...report, status } : report,
    ),
  });
}
