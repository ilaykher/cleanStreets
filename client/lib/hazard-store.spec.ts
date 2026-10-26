import { afterAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_HAZARD_FILTERS, type HazardReport } from "./hazards";
import { buildMockReports } from "./mock-reports";

describe("browser-local hazard actions", () => {
  afterAll(() => vi.unstubAllGlobals());

  it("enforces net-vote thresholds and one vote or resolution per browser", async () => {
    const reports: HazardReport[] = [
      { id: "up", typeId: "pothole", description: "Upvote threshold", area: "Barangay 176-A", lat: 14.777, lng: 121.043, createdAt: new Date().toISOString(), upvotes: 2, downvotes: 0, status: "pending" },
      { id: "down", typeId: "pothole", description: "Downvote threshold", area: "Barangay 176-A", lat: 14.777, lng: 121.044, createdAt: new Date().toISOString(), upvotes: 0, downvotes: 2, status: "pending" },
      { id: "balanced", typeId: "pothole", description: "Balanced votes", area: "Barangay 176-A", lat: 14.777, lng: 121.045, createdAt: new Date().toISOString(), upvotes: 2, downvotes: 2, status: "pending" },
      { id: "resolve", typeId: "pothole", description: "Resolution threshold", area: "Barangay 176-A", lat: 14.777, lng: 121.046, createdAt: new Date().toISOString(), upvotes: 3, downvotes: 0, status: "verified", resolutionConfirms: 2 },
      ...buildMockReports(),
    ];
    const values = new Map<string, string>([["cleanstreets:v7", JSON.stringify({ reports, myVotes: {}, myResolutions: [], filters: DEFAULT_HAZARD_FILTERS })]]);
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    } });
    vi.resetModules();
    const store = await import("./hazard-store");

    const duplicate = reports.find((report) => report.id === "mock-1")!;
    const separateInput = { typeId: duplicate.typeId, description: "Another nearby pothole report", area: duplicate.area, lat: duplicate.lat, lng: duplicate.lng };
    const duplicateResult = store.submitReport(separateInput);
    expect(reports.some((report) => report.id === duplicateResult.duplicateId)).toBe(true);
    const countBeforeAnyway = JSON.parse(values.get("cleanstreets:v7")!).reports.length;
    expect(store.submitReport(separateInput, true).reportId).toBeTruthy();
    expect(JSON.parse(values.get("cleanstreets:v7")!).reports).toHaveLength(countBeforeAnyway + 1);

    expect(store.castVote("up", "up")).toBe(true);
    expect(store.castVote("up", "up")).toBe(false);
    expect(store.castVote("down", "down")).toBe(true);
    expect(store.castVote("down", "down")).toBe(false);
    expect(store.castVote("balanced", "up")).toBe(true);
    expect(store.castVote("balanced", "up")).toBe(false);
    expect(store.confirmResolved("resolve")).toBe(true);
    expect(store.confirmResolved("resolve")).toBe(false);

    const saved = JSON.parse(values.get("cleanstreets:v7")!) as { reports: HazardReport[] };
    expect(saved.reports.find((report) => report.id === "up")?.status).toBe("verified");
    expect(saved.reports.find((report) => report.id === "down")?.status).toBe("rejected");
    expect(saved.reports.find((report) => report.id === "balanced")?.status).toBe("pending");
    expect(saved.reports.find((report) => report.id === "resolve")?.status).toBe("resolved");

    const countBeforeFilter = saved.reports.length;
    store.setHazardFilters({ typeId: "pothole", status: "verified", severity: "moderate" });
    const afterFilter = JSON.parse(values.get("cleanstreets:v7")!) as { reports: HazardReport[]; filters: typeof DEFAULT_HAZARD_FILTERS };
    expect(afterFilter.reports).toHaveLength(countBeforeFilter);
    expect(afterFilter.filters).toEqual({ typeId: "pothole", status: "verified", severity: "moderate" });
  });

  it("replaces legacy test pins with the clean mock set", async () => {
    const reports = buildMockReports();
    const invalidUserPin = { ...reports[0], id: "manual-test-pin", lat: 0, lng: 0 };
    const values = new Map<string, string>([["cleanstreets:v6", JSON.stringify({ reports: [...reports, invalidUserPin], myVotes: {}, myResolutions: [], filters: DEFAULT_HAZARD_FILTERS })]]);
    vi.stubGlobal("window", { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    } });
    vi.resetModules();
    await import("./hazard-store");
    const saved = JSON.parse(values.get("cleanstreets:v7")!) as { reports: HazardReport[] };
    expect(saved.reports).toHaveLength(100);
    expect(saved.reports.every((report) => report.id.startsWith("mock-"))).toBe(true);
    expect(saved.reports.some((report) => report.id === "manual-test-pin")).toBe(false);
  });
});
