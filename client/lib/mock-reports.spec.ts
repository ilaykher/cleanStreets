import { describe, expect, it } from "vitest";
import { barangayAt } from "./barangay-boundaries";
import { AREAS } from "./hazards";
import { buildMockReports } from "./mock-reports";

describe("buildMockReports", () => {
  it("creates exactly 100 mock reports within their assigned barangays", () => {
    const reports = buildMockReports(1_761_234_567_890);
    expect(reports).toHaveLength(100);
    expect(reports.every((report) => barangayAt(report) === report.area)).toBe(true);
    expect(new Set(reports.map((report) => report.area))).toEqual(new Set(AREAS));
    expect(AREAS.map((area) => reports.filter((report) => report.area === area).length))
      .toEqual([17, 17, 17, 17, 16, 16]);
    expect(reports.every((report) => Date.parse(report.createdAt) <= 1_761_234_567_890 && Date.parse(report.createdAt) > 1_761_234_567_890 - 22 * 86_400_000)).toBe(true);
  });

  it("includes pending, verified, and resolved examples with realistic progress", () => {
    const reports = buildMockReports(1_761_234_567_890);
    expect(new Set(reports.map((report) => report.status))).toEqual(new Set(["pending", "verified", "resolved"]));
    expect(reports.filter((report) => report.status === "pending").every((report) => report.upvotes - report.downvotes < 3)).toBe(true);
    expect(reports.filter((report) => report.status !== "pending").every((report) => report.upvotes - report.downvotes >= 3)).toBe(true);
    expect(reports.filter((report) => report.status === "resolved").every((report) => report.resolutionConfirms === 3)).toBe(true);
    expect(reports.filter((report) => report.status === "pending")).toHaveLength(40);
    expect(reports.filter((report) => report.status === "verified")).toHaveLength(40);
    expect(reports.filter((report) => report.status === "resolved")).toHaveLength(20);
  });
});
