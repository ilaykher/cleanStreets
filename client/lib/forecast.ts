import type { Area, HazardReport } from "./hazards";

export const FORECAST_TRIALS = 5000;
export const HOTSPOT_THRESHOLD = 3;
const VOLUNTEER_CAPACITY = 2;
const DAY_MS = 86_400_000;

export interface AreaForecast {
  area: Area;
  expectedVerified: number;
  hotspotProbability: number;
  recommendedVolunteers: number;
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function samplePoisson(lambda: number, random: () => number) {
  const limit = Math.exp(-lambda);
  let count = 0;
  let product = 1;
  do {
    count++;
    product *= random();
  } while (product > limit);
  return count - 1;
}

export function forecastAreas(
  reports: HazardReport[],
  areas: readonly Area[],
  now = Date.now(),
  seed = 20261025,
): AreaForecast[] {
  const random = createRandom(seed);

  const decided = reports.filter((report) => report.status !== "pending");
  const verifiedOutcomes = decided.filter(
    (report) => report.status !== "rejected",
  ).length;
  const verificationRate = (verifiedOutcomes + 1) / (decided.length + 2);

  return areas.map((area) => {
    const recentInArea = reports.filter(
      (report) =>
        report.area === area && now - new Date(report.createdAt).getTime() <= 14 * DAY_MS,
    ).length;
    const weeklyRate = Math.max(recentInArea / 2, 0.1);

    let totalVerified = 0;
    let hotspotHits = 0;
    for (let trial = 0; trial < FORECAST_TRIALS; trial++) {
      const newReports = samplePoisson(weeklyRate, random);
      let verified = 0;
      for (let i = 0; i < newReports; i++) {
        if (random() < verificationRate) verified++;
      }
      totalVerified += verified;
      if (verified >= HOTSPOT_THRESHOLD) hotspotHits++;
    }

    const expectedVerified = totalVerified / FORECAST_TRIALS;
    return {
      area,
      expectedVerified,
      hotspotProbability: hotspotHits / FORECAST_TRIALS,
      recommendedVolunteers: Math.max(1, Math.ceil(expectedVerified / VOLUNTEER_CAPACITY)),
    };
  });
}
