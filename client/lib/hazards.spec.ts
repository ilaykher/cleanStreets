import { describe, expect, it } from "vitest";
import { CountMinSketch } from "./count-min-sketch";
import { AREAS, applyResolutionConfirmation, applyVote, buildSeedReports, findAreaAtLocation, findDuplicate, type HazardReport } from "./hazards";

const base: HazardReport = {
  id: "r1",
  typeId: "pothole",
  description: "Large pothole",
  area: "Barangay 176-A",
  lat: 14.6,
  lng: 120.98,
  createdAt: new Date(0).toISOString(),
  upvotes: 0,
  downvotes: 0,
  resolutionConfirmations: 0,
  resolvedAt: null,
  status: "pending",
};

describe("applyVote", () => {
  it("verifies a pending report at the upvote threshold", () => {
    const once = applyVote(applyVote(base, "up"), "up");
    expect(once.status).toBe("pending");
    expect(applyVote(once, "up").status).toBe("verified");
  });

  it("rejects a report after three community downvotes", () => {
    const report = [1, 2, 3].reduce((r) => applyVote(r, "down"), base);
    expect(report.status).toBe("rejected");
  });

  it("uses net votes, so opposing votes cancel toward each threshold", () => {
    const mixed = applyVote(applyVote(applyVote(base, "up"), "up"), "down");
    expect(mixed.status).toBe("pending");
    expect(applyVote(applyVote(mixed, "up"), "up").status).toBe("verified");
  });

  it("keeps a pending report pending when downvotes are not yet decisive", () => {
    const report = applyVote(applyVote(applyVote(base, "up"), "down"), "down");
    expect(report.status).toBe("pending");
  });

  it("does not accept report votes after a report is resolved", () => {
    const resolved = { ...base, status: "resolved" as const, upvotes: 3 };
    expect(applyVote(resolved, "up")).toEqual(resolved);
  });
});

describe("approximate barangay polygons", () => {
  it("detects locations in all six demonstration areas and rejects points outside them", () => {
    const centers = [
      { lat: 14.7805, lng: 121.045 },
      { lat: 14.7695, lng: 121.048 },
      { lat: 14.7695, lng: 121.0385 },
      { lat: 14.7695, lng: 121.0295 },
      { lat: 14.7805, lng: 121.0385 },
      { lat: 14.7805, lng: 121.0295 },
    ];
    expect(centers.map(findAreaAtLocation)).toEqual(AREAS);
    expect(findAreaAtLocation({ lat: 14.78, lng: 121.055 })).toBeNull();
  });

  it("seeds ten mock reports in each of the six barangays", () => {
    const reports = buildSeedReports(Date.now());
    expect(reports).toHaveLength(60);
    AREAS.forEach((area) => expect(reports.filter((report) => report.area === area)).toHaveLength(10));
    reports.forEach((report) => expect(findAreaAtLocation(report)).toBe(report.area));
  });
});

describe("community resolution confirmations", () => {
  it("resolves a verified hazard after the third confirmation", () => {
    const verified = { ...base, status: "verified" as const };
    const first = applyResolutionConfirmation(verified);
    const second = applyResolutionConfirmation(first);
    const third = applyResolutionConfirmation(second);
    expect(first.resolutionConfirmations).toBe(1);
    expect(second.status).toBe("verified");
    expect(third.status).toBe("resolved");
    expect(third.resolvedAt).not.toBeNull();
    expect(applyResolutionConfirmation(third)).toEqual(third);
  });
});

describe("findDuplicate", () => {
  it("matches an open report of the same type within the radius", () => {
    const open = { ...base, status: "pending" as const };
    const nearby = { typeId: "pothole" as const, lat: 14.60002, lng: 120.98002 };
    expect(findDuplicate([open], nearby)?.id).toBe("r1");
  });

  it("ignores other hazard types and distant reports", () => {
    const open = { ...base, status: "pending" as const };
    expect(findDuplicate([open], { typeId: "flooded-road", lat: 14.6, lng: 120.98 })).toBeUndefined();
    expect(findDuplicate([open], { typeId: "pothole", lat: 14.61, lng: 120.98 })).toBeUndefined();
  });
});

describe("CountMinSketch", () => {
  it("never undercounts a key", () => {
    const sketch = new CountMinSketch(64, 4);
    for (let i = 0; i < 25; i++) sketch.add("pothole");
    for (let i = 0; i < 3; i++) sketch.add("flooded-road");
    expect(sketch.estimate("pothole")).toBeGreaterThanOrEqual(25);
    expect(sketch.estimate("flooded-road")).toBeGreaterThanOrEqual(3);
    expect(sketch.estimate("never-seen")).toBeLessThanOrEqual(28);
  });
});
