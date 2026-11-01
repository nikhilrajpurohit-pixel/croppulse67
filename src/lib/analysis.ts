import { useQueries, useQuery } from "@tanstack/react-query";
import { CROPS, areaToM2, recommend, simulate, type FieldParams, type SimDay } from "./agro";
import { weatherQuery, type WeatherData } from "./weather";
import type { Field, IrrigationLog } from "./store";

export const toParams = (f: Field): FieldParams => ({
  crop: f.crop, stage: f.stage, soil: f.soil, method: f.method,
  areaM2: areaToM2(f.area, f.areaUnit), initialMoisture: f.initialMoisture,
  rootDepth: f.rootDepth, fieldCapacity: f.fieldCapacity, wiltingPoint: f.wiltingPoint,
});
export const cropName = (f: Field) => (f.crop === "other" && f.cropOther ? f.cropOther : CROPS[f.crop].label);

export interface SavingsDay { date: string; traditionalL: number; croppulseL: number; savedL: number }

export function analyse(f: Field, w: WeatherData, logs: IrrigationLog[]) {
  const p = toParams(f);
  const start = f.moistureDate > w.today ? w.today : f.moistureDate;
  const hist = w.history.filter((d) => d.date >= start);
  const days = [...hist, w.todayDay, ...w.forecast];
  const logMap: Record<string, number> = {};
  logs.filter((l) => l.fieldId === f.id).forEach((l) => (logMap[l.date] = (logMap[l.date] ?? 0) + l.appliedMm));
  const sim: SimDay[] = simulate(p, days, "logged", logMap);
  const todayIdx = hist.length;
  const current = sim[todayIdx]?.storage ?? 0;
  const rec = recommend(p, current, w.todayDay.et0, w.forecast, cropName(f));

  // Scenario comparison over observed days only (start .. yesterday)
  const cp = simulate(p, hist, "croppulse");
  const tr = simulate(p, hist, "traditional");
  const savings: SavingsDay[] = hist.map((d, i) => {
    const t = tr[i].irrigationGross * p.areaM2;
    const c = cp[i].irrigationGross * p.areaM2;
    return { date: d.date, traditionalL: t, croppulseL: c, savedL: t - c };
  });
  return { params: p, sim, todayIdx, rec, savings, start };
}
export type Analysis = ReturnType<typeof analyse>;

export function useFieldAnalysis(f: Field | undefined, logs: IrrigationLog[]) {
  const q = useQuery({ ...weatherQuery(f?.lat ?? 0, f?.lon ?? 0), enabled: !!f });
  const a = f && q.data ? analyse(f, q.data, logs) : undefined;
  return { q, a };
}

export function useAllAnalyses(fields: Field[], logs: IrrigationLog[]) {
  const qs = useQueries({ queries: fields.map((f) => weatherQuery(f.lat, f.lon)) });
  return fields.map((f, i) => ({ field: f, q: qs[i], a: qs[i].data ? analyse(f, qs[i].data!, logs) : undefined }));
}

export function fmtVol(litres: number, unit: "L" | "m3") {
  if (unit === "m3") return `${(litres / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} m³`;
  if (Math.abs(litres) >= 100000) return `${(litres / 100000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} lakh L`;
  return `${Math.round(litres).toLocaleString("en-IN")} L`;
}
export const fmtTemp = (c: number, u: "C" | "F") => (u === "F" ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`);
