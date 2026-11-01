import { describe, expect, it } from "vitest";
import { recommend, simulate, soilProfile, effectiveRain, areaToM2, type FieldParams, type DayWeather } from "./agro";

const field: FieldParams = { crop: "tomato", stage: "mid", soil: "loamy", method: "drip", areaM2: 10000, initialMoisture: 27 };
const dry = (n: number, rain = 0): DayWeather[] =>
  Array.from({ length: n }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, rain, rainProb: 0, et0: 5, isForecast: false }));

describe("agro engine", () => {
  it("computes TAW = (FC-WP)*Zr*1000", () => {
    expect(soilProfile(field).taw).toBeCloseTo((0.27 - 0.12) * 0.9 * 1000);
  });
  it("ignores rain below 5 mm", () => {
    expect(effectiveRain(4)).toBe(0);
    expect(effectiveRain(10)).toBe(8);
  });
  it("converts 1 acre to 4046.86 m2", () => {
    expect(areaToM2(1, "acres")).toBeCloseTo(4046.86);
  });
  it("needs no irrigation at field capacity", () => {
    const { taw } = soilProfile(field);
    expect(recommend(field, taw, 5, dry(3), "Tomato").level).toBe("none");
  });
  it("recommends irrigation when depleted and no rain, volume = gross mm x area", () => {
    const r = recommend(field, 20, 5, dry(3), "Tomato");
    expect(["now", "urgent"]).toContain(r.level);
    expect(r.litres).toBeCloseTo(r.grossMm * 10000);
  });
  it("postpones irrigation when heavy rain is forecast", () => {
    expect(recommend(field, 20, 5, dry(3, 80), "Tomato").grossMm).toBe(0);
  });
  it("storage drops by Kc*ET0 on a dry day", () => {
    const s = simulate(field, dry(1), "logged");
    const { taw } = soilProfile(field);
    expect(s[0]!.storage).toBeCloseTo(taw - 1.15 * 5);
  });
});
