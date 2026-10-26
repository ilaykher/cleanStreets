import { describe, expect, it } from "vitest";
import { CountMinSketch } from "./count-min-sketch";
import { barangayAt } from "./barangay-boundaries";
import { AREAS, applyVote, findDuplicate, type HazardReport } from "./hazards";
import { BARANGAY_BOUNDARIES } from "./barangay-boundaries";

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
  status: "pending",
};

describe("applyVote", () => {
  it("verifies a pending report at the upvote threshold", () => {
    const once = applyVote(applyVote(base, "up"), "up");
    expect(once.status).toBe("pending");
    expect(applyVote(once, "up").status).toBe("verified");
  });

  it("rejects a report once downvotes outnumber upvotes past the threshold", () => {
    const report = [1, 2, 3].reduce((r) => applyVote(r, "down"), base);
    expect(report.status).toBe("rejected");
  });

  it("keeps a pending report pending when downvotes are not yet decisive", () => {
    const report = applyVote(applyVote(applyVote(base, "up"), "down"), "down");
    expect(report.status).toBe("pending");
  });

});

describe("findDuplicate", () => {
  it("matches an open report of the same type within the radius", () => {
    const open = { ...base, status: "verified" as const };
    const nearby = { typeId: "pothole" as const, lat: 14.60002, lng: 120.98002 };
    expect(findDuplicate([open], nearby)?.id).toBe("r1");
  });

  it("ignores other hazard types and distant reports", () => {
    const open = { ...base, status: "verified" as const };
    expect(findDuplicate([open], { typeId: "flooded-road", lat: 14.6, lng: 120.98 })).toBeUndefined();
    expect(findDuplicate([open], { typeId: "pothole", lat: 14.61, lng: 120.98 })).toBeUndefined();
  });
});

describe("barangayAt", () => {
  it("resolves a point inside Bagong Silang to its barangay", () => {
    expect(barangayAt({ lat: 14.7717, lng: 121.0517 })).toBe("Barangay 176-B");
  });

  it("returns null for a point outside the outlined barangays", () => {
    expect(barangayAt({ lat: 14.6, lng: 120.98 })).toBeNull();
  });

  it("keeps the six Bagong Silang barangay outlines", () => {
    expect(BARANGAY_BOUNDARIES.map(({ area }) => area)).toEqual(AREAS);
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
