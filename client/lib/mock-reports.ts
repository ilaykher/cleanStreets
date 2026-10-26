import { barangayAt, BARANGAY_BOUNDARIES } from "./barangay-boundaries";
import { AREAS, HAZARD_TYPES, type HazardReport, type HazardTypeId } from "./hazards";

const DESCRIPTIONS: Record<HazardTypeId, string[]> = {
  pothole: ["Deep pothole along the right side of the road.", "Uneven road surface near the intersection.", "Pothole collecting water after recent rain."],
  "flooded-road": ["Road floods here after heavy rain.", "Standing water is blocking part of the lane.", "Drainage overflow leaves water across the street."],
  "broken-streetlight": ["Streetlight has been out for several nights.", "Lamp flickers and goes dark after sunset.", "Two nearby streetlights are not working."],
  "fallen-tree": ["Large branch has fallen beside the road.", "A low tree branch is obstructing the walkway.", "Storm debris is partly blocking the street."],
  "open-manhole": ["Manhole cover is missing near the curb.", "Open drain is difficult to see at night.", "Loose cover shifts when vehicles pass."],
  "damaged-sidewalk": ["Broken sidewalk slabs create a tripping hazard.", "The sidewalk is cracked beside the road.", "Uneven pavement makes this walkway difficult to use."],
  "garbage-blocking": ["Uncollected garbage is narrowing the road.", "Trash bags are blocking part of the sidewalk.", "Loose rubbish is scattered across the pedestrian path."],
  "broken-traffic-sign": ["Traffic sign is bent and hard to read.", "Road sign is turned away from approaching traffic.", "Damaged sign is leaning over the sidewalk."],
  "blocked-pedestrian-lane": ["Parked materials are blocking the pedestrian lane.", "A vendor setup narrows the walkway.", "Construction debris is obstructing the footpath."],
  other: ["Road obstruction is creating a hazard for pedestrians.", "Damaged roadside fixture needs attention.", "A local street hazard was reported near this spot."],
};

function randomPointInArea(area: (typeof AREAS)[number], random: () => number) {
  const ring = BARANGAY_BOUNDARIES.find((boundary) => boundary.area === area)!.ring;
  const minLat = Math.min(...ring.map(([lat]) => lat));
  const maxLat = Math.max(...ring.map(([lat]) => lat));
  const minLng = Math.min(...ring.map(([, lng]) => lng));
  const maxLng = Math.max(...ring.map(([, lng]) => lng));
  for (let attempt = 0; attempt < 10_000; attempt++) {
    const point = { lat: minLat + random() * (maxLat - minLat), lng: minLng + random() * (maxLng - minLng) };
    if (barangayAt(point) === area) return point;
  }
  throw new Error(`Could not generate a mock point inside ${area}`);
}

export function buildMockReports(now = Date.now(), random = Math.random): HazardReport[] {
  const areaCounts = AREAS.map((_, index) => 16 + Number(index < 4));
  const areaEnds = areaCounts.map((_, index) => areaCounts.slice(0, index + 1).reduce((sum, n) => sum + n, 0));
  return Array.from({ length: 100 }, (_, index) => {
    const areaIndex = areaEnds.findIndex((end) => index < end);
    const area = AREAS[areaIndex];
    const typeId = HAZARD_TYPES[Math.floor(random() * HAZARD_TYPES.length)].id;
    const status = (["pending", "verified", "resolved"] as const)[index % 10 < 4 ? 0 : index % 10 < 8 ? 1 : 2];
    const upvotes = status === "pending" ? 1 : 3 + Math.floor(random() * 5);
    const downvotes = status === "pending" ? 1 : Math.floor(random() * (upvotes - 2));
    const createdAt = new Date(now - Math.floor(random() * 21) * 86_400_000 - Math.floor(random() * 86_400_000)).toISOString();

    return {
      id: `mock-${index + 1}`,
      typeId,
      description: DESCRIPTIONS[typeId][Math.floor(random() * DESCRIPTIONS[typeId].length)],
      area,
      ...randomPointInArea(area, random),
      createdAt,
      upvotes,
      downvotes,
      status,
      ...(status === "resolved" ? { resolutionConfirms: 3 } : status === "verified" ? { resolutionConfirms: 2 } : {}),
    };
  });
}
