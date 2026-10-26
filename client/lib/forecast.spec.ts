import { describe, expect, it } from "vitest";
import { AREAS } from "./hazards";
import { forecastAreas, FORECAST_TRIALS } from "./forecast";

describe("forecastAreas", () => {
  it("runs Monte Carlo forecasts with bounded hotspot probability and a likely type", () => {
    const forecast = forecastAreas([], AREAS, 1_761_234_567_890);
    expect(FORECAST_TRIALS).toBeGreaterThan(0);
    expect(forecast).toHaveLength(AREAS.length);
    forecast.forEach((row) => {
      expect(row.hotspotProbability).toBeGreaterThanOrEqual(0);
      expect(row.hotspotProbability).toBeLessThanOrEqual(1);
      expect(row.expectedVerified).toBeGreaterThanOrEqual(0);
      expect(row.likelyHazardType).toBeTruthy();
    });
  });
});
