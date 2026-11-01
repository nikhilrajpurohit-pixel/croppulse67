/**
 * CropPulse agronomy engine.
 *
 * Root-zone soil-water balance (all values in mm of water over the root zone):
 *   S(t) = S(t-1) + P_eff + I_net - ETc_adj - D - R
 * S is plant-available water stored in the root zone (0 .. TAW).
 *   TAW = (FC - WP) * Zr * 1000           total available water (mm)
 *   RAW = p * TAW                          readily available water (mm)
 *   ETc = Kc * ET0   (FAO-56 single crop coefficient)
 *   ETc_adj = Ks * ETc, Ks = S / (TAW - RAW) when depletion > RAW (water stress)
 *   R (runoff) = rain not counted as effective; D (drainage) = water above TAW.
 * Soil moisture is SIMULATED, never measured, unless the farmer enters a sensor reading.
 */

export type CropKey =
  | "rice" | "wheat" | "maize" | "tomato" | "potato" | "onion"
  | "sugarcane" | "cotton" | "soybean" | "groundnut" | "other";
export type SoilKey = "sandy" | "clay" | "loamy" | "silt" | "other";
export type MethodKey = "drip" | "sprinkler" | "flood" | "furrow" | "other";
export type StageKey = "initial" | "development" | "mid" | "late";

/** FAO-56 Table 12 / 22 (simplified). rootDepth in m, p = depletion fraction. */
export const CROPS: Record<CropKey, { label: string; kcIni: number; kcMid: number; kcEnd: number; rootDepth: number; p: number }> = {
  rice: { label: "Rice", kcIni: 1.05, kcMid: 1.2, kcEnd: 0.9, rootDepth: 0.5, p: 0.2 },
  wheat: { label: "Wheat", kcIni: 0.7, kcMid: 1.15, kcEnd: 0.4, rootDepth: 1.2, p: 0.55 },
  maize: { label: "Maize", kcIni: 0.3, kcMid: 1.2, kcEnd: 0.6, rootDepth: 1.0, p: 0.55 },
  tomato: { label: "Tomato", kcIni: 0.6, kcMid: 1.15, kcEnd: 0.8, rootDepth: 0.9, p: 0.4 },
  potato: { label: "Potato", kcIni: 0.5, kcMid: 1.15, kcEnd: 0.75, rootDepth: 0.5, p: 0.35 },
  onion: { label: "Onion", kcIni: 0.7, kcMid: 1.05, kcEnd: 0.75, rootDepth: 0.4, p: 0.3 },
  sugarcane: { label: "Sugarcane", kcIni: 0.4, kcMid: 1.25, kcEnd: 0.75, rootDepth: 1.5, p: 0.65 },
  cotton: { label: "Cotton", kcIni: 0.35, kcMid: 1.2, kcEnd: 0.6, rootDepth: 1.3, p: 0.65 },
  soybean: { label: "Soybean", kcIni: 0.4, kcMid: 1.15, kcEnd: 0.5, rootDepth: 0.8, p: 0.5 },
  groundnut: { label: "Groundnut", kcIni: 0.4, kcMid: 1.15, kcEnd: 0.6, rootDepth: 0.6, p: 0.5 },
  other: { label: "Other", kcIni: 0.5, kcMid: 1.05, kcEnd: 0.7, rootDepth: 0.7, p: 0.5 },
};

/** Volumetric field capacity / wilting point (fraction). */
export const SOILS: Record<SoilKey, { label: string; fc: number; wp: number }> = {
  sandy: { label: "Sandy", fc: 0.12, wp: 0.05 },
  clay: { label: "Clay", fc: 0.36, wp: 0.22 },
  loamy: { label: "Loamy", fc: 0.27, wp: 0.12 },
  silt: { label: "Silt", fc: 0.3, wp: 0.13 },
  other: { label: "Other", fc: 0.25, wp: 0.11 },
};

/**
 * Application efficiency and the "traditional" fixed schedule used for comparison:
 * apply `tradDepth` mm (gross) every `tradInterval` days regardless of weather.
 */
export const METHODS: Record<MethodKey, { label: string; efficiency: number; tradInterval: number; tradDepth: number }> = {
  drip: { label: "Drip irrigation", efficiency: 0.9, tradInterval: 2, tradDepth: 12 },
  sprinkler: { label: "Sprinkler irrigation", efficiency: 0.75, tradInterval: 3, tradDepth: 25 },
  flood: { label: "Flood irrigation", efficiency: 0.5, tradInterval: 7, tradDepth: 60 },
  furrow: { label: "Furrow irrigation", efficiency: 0.6, tradInterval: 5, tradDepth: 45 },
  other: { label: "Other", efficiency: 0.65, tradInterval: 4, tradDepth: 30 },
};

export const STAGES: Record<StageKey, string> = {
  initial: "Initial stage",
  development: "Development stage",
  mid: "Mid-season stage",
  late: "Late-season stage",
};

export function kcFor(crop: CropKey, stage: StageKey) {
  const c = CROPS[crop];
  if (stage === "initial") return c.kcIni;
  if (stage === "development") return (c.kcIni + c.kcMid) / 2;
  if (stage === "mid") return c.kcMid;
  return c.kcEnd;
}

export interface FieldParams {
  crop: CropKey;
  stage: StageKey;
  soil: SoilKey;
  method: MethodKey;
  areaM2: number;
  initialMoisture: number; // volumetric %, e.g. 22
  rootDepth?: number; // m
  fieldCapacity?: number; // volumetric %
  wiltingPoint?: number; // volumetric %
}

export function soilProfile(f: FieldParams) {
  const fc = f.fieldCapacity ? f.fieldCapacity / 100 : SOILS[f.soil].fc;
  const wp = f.wiltingPoint ? f.wiltingPoint / 100 : SOILS[f.soil].wp;
  const zr = f.rootDepth ?? CROPS[f.crop].rootDepth;
  const taw = Math.max(1, (fc - wp) * zr * 1000);
  const raw = CROPS[f.crop].p * taw;
  return { fc, wp, zr, taw, raw };
}

/** Convert volumetric moisture % to available storage (mm) and back. */
export function moistureToStorage(pct: number, fc: number, wp: number, zr: number) {
  const s = (pct / 100 - wp) * zr * 1000;
  return Math.min(Math.max(s, 0), (fc - wp) * zr * 1000);
}
export function storageToMoisture(s: number, wp: number, zr: number) {
  return (wp + s / (zr * 1000)) * 100;
}

/** USDA-style simplification: rain under 5 mm is mostly intercepted/evaporated; 80% of larger events infiltrates. */
export function effectiveRain(p: number) {
  return p < 5 ? 0 : p * 0.8;
}

export interface DayWeather {
  date: string; // YYYY-MM-DD
  rain: number; // mm
  rainProb: number | null;
  et0: number; // mm
  isForecast: boolean;
}

export type SimMode = "logged" | "croppulse" | "traditional";

export interface SimDay {
  date: string;
  isForecast: boolean;
  storage: number;
  moisture: number;
  rain: number;
  effRain: number;
  runoff: number;
  etc: number;
  drainage: number;
  irrigationGross: number; // mm applied at field
  depletion: number;
}

/**
 * Run the daily water balance from `start` (inclusive) using the starting storage.
 * - logged: irrigation comes from the farmer's records (forecast days get none).
 * - croppulse: irrigate (refill to FC) when depletion > RAW and the next 2 days' effective rain won't cover it.
 * - traditional: fixed schedule from METHODS.
 */
export function simulate(
  f: FieldParams,
  days: DayWeather[],
  mode: SimMode,
  logs: Record<string, number> = {},
): SimDay[] {
  const { fc, wp, zr, taw, raw } = soilProfile(f);
  const kc = kcFor(f.crop, f.stage);
  const m = METHODS[f.method];
  let s = moistureToStorage(f.initialMoisture, fc, wp, zr);
  const out: SimDay[] = [];
  days.forEach((d, i) => {
    const eff = effectiveRain(d.rain);
    let gross = 0;
    if (mode === "logged" && !d.isForecast) gross = logs[d.date] ?? 0;
    if (mode === "traditional" && i % m.tradInterval === 0) gross = m.tradDepth;
    if (mode === "croppulse") {
      const dep = taw - s;
      const rainAhead = days.slice(i, i + 2).reduce((a, x) => a + effectiveRain(x.rain), 0);
      if (dep > raw && dep - rainAhead > 0) gross = (dep - rainAhead) / m.efficiency;
    }
    const net = gross * m.efficiency;
    const etc = kc * d.et0;
    const dep = taw - s;
    const ks = dep > raw ? Math.max(0, s / (taw - raw)) : 1;
    const etcAdj = Math.min(etc * ks, s + eff + net);
    let next = s + eff + net - etcAdj;
    const drainage = Math.max(0, next - taw);
    next = Math.min(taw, Math.max(0, next));
    s = next;
    out.push({
      date: d.date,
      isForecast: d.isForecast,
      storage: s,
      moisture: storageToMoisture(s, wp, zr),
      rain: d.rain,
      effRain: eff,
      runoff: d.rain - eff,
      etc: etcAdj,
      drainage,
      irrigationGross: gross,
      depletion: taw - s,
    });
  });
  return out;
}

export type RecLevel = "none" | "soon" | "now" | "urgent";

export interface Recommendation {
  level: RecLevel;
  title: string;
  reason: string;
  deficitMm: number;
  netMm: number;
  grossMm: number;
  litres: number;
  rainNext48: number;
  savedLitres: number;
  storage: number;
  moisture: number;
  taw: number;
  raw: number;
  etcToday: number;
}

/**
 * Decide today's action from current storage and upcoming forecast.
 * `current` is today's simulated storage; `forecast` are future days (from tomorrow).
 */
export function recommend(f: FieldParams, current: number, todayEt0: number, forecast: DayWeather[], cropLabel: string): Recommendation {
  const { wp, zr, taw, raw } = soilProfile(f);
  const kc = kcFor(f.crop, f.stage);
  const m = METHODS[f.method];
  const deficit = taw - current;
  const rain48 = forecast.slice(0, 2).reduce((a, d) => a + d.rain, 0);
  const eff48 = forecast.slice(0, 2).reduce((a, d) => a + effectiveRain(d.rain), 0);
  const etcToday = kc * todayEt0;
  // Project 3 days ahead with forecast ETc and rain (no irrigation)
  let proj = current;
  let daysToStress: number | null = null;
  forecast.slice(0, 3).forEach((d, i) => {
    proj = Math.min(taw, Math.max(0, proj + effectiveRain(d.rain) - kc * d.et0));
    if (daysToStress === null && taw - proj > raw) daysToStress = i + 1;
  });
  const moisture = storageToMoisture(current, wp, zr);
  const base = { deficitMm: deficit, rainNext48: rain48, storage: current, moisture, taw, raw, etcToday };
  const tradLitres = m.tradDepth * f.areaM2;
  const name = cropLabel.toLowerCase();

  if (deficit > raw) {
    const net = Math.max(0, deficit - eff48);
    if (net <= 0) {
      return { ...base, level: "soon", title: "Wait for rain", netMm: 0, grossMm: 0, litres: 0, savedLitres: tradLitres,
        reason: `Your ${name} field is below the comfortable moisture level, but about ${rain48.toFixed(1)} mm of rain is forecast in the next 48 hours, which should refill the root zone. Irrigation can be postponed; check again tomorrow.` };
    }
    const gross = net / m.efficiency;
    const urgent = deficit > 0.8 * taw;
    return { ...base, level: urgent ? "urgent" : "now", title: urgent ? "Irrigate urgently" : "Irrigate now",
      netMm: net, grossMm: gross, litres: gross * f.areaM2, savedLitres: Math.max(0, (m.tradDepth - gross) * f.areaM2),
      reason: `Estimated depletion is ${deficit.toFixed(1)} mm, beyond the ${raw.toFixed(1)} mm your ${name} can use without stress${urgent ? " and close to the wilting point" : ""}. Only ${rain48.toFixed(1)} mm of rain is expected in 48 hours, so apply about ${gross.toFixed(1)} mm (${METHODS[f.method].label.toLowerCase()} at ${(m.efficiency * 100).toFixed(0)}% efficiency).` };
  }
  if (daysToStress !== null) {
    return { ...base, level: "soon", title: "Irrigate soon", netMm: 0, grossMm: 0, litres: 0, savedLitres: 0,
      reason: `Your ${name} field has enough water today, but at the forecast crop demand it will drop below the stress threshold in about ${daysToStress} day${daysToStress > 1 ? "s" : ""}. Plan irrigation then unless rain arrives.` };
  }
  return { ...base, level: "none", title: "No irrigation required", netMm: 0, grossMm: 0, litres: 0, savedLitres: tradLitres,
    reason: `Your ${name} field currently has sufficient estimated soil moisture (${(current).toFixed(1)} of ${taw.toFixed(0)} mm available).${rain48 >= 5 ? ` Rainfall of ${rain48.toFixed(1)} mm is forecast in the next 48 hours.` : ""} Skipping irrigation avoids unnecessary water use.` };
}

export const areaToM2 = (area: number, unit: "acres" | "hectares") => (unit === "acres" ? area * 4046.86 : area * 10000);

/** Hargreaves ET0 fallback (FAO-56 eq. 52) when Open-Meteo ET0 is missing. */
export function hargreavesEt0(tmax: number, tmin: number, latDeg: number, date: string) {
  const doy = Math.floor((Date.parse(date) - Date.parse(date.slice(0, 4) + "-01-01")) / 86400000) + 1;
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365);
  const dec = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dec))));
  const ra = ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.sin(ws));
  const tmean = (tmax + tmin) / 2;
  return Math.max(0, 0.0023 * 0.408 * ra * (tmean + 17.8) * Math.sqrt(Math.max(0, tmax - tmin)));
}
