import { useSyncExternalStore } from "react";
import type { CropKey, MethodKey, SoilKey, StageKey } from "./agro";

export interface Field {
  id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  crop: CropKey;
  cropOther?: string;
  area: number;
  areaUnit: "acres" | "hectares";
  soil: SoilKey;
  method: MethodKey;
  stage: StageKey;
  initialMoisture: number;
  moistureSource: "estimate" | "sensor";
  moistureDate: string; // YYYY-MM-DD the reading applies to
  rootDepth?: number | undefined;
  fieldCapacity?: number | undefined;
  wiltingPoint?: number | undefined;
  createdAt: number;
}
export interface IrrigationLog { id: string; fieldId: string; date: string; appliedMm: number; recommendedMm: number }
export interface Notice { id: string; key?: string; message: string; kind: "rain" | "irrigation" | "moisture" | "system"; ts: number; read: boolean }
export interface Profile {
  name: string;
  email: string;
  tempUnit: "C" | "F";
  volumeUnit: "L" | "m3";
  defaultLocation: string;
  notify: { rain: boolean; irrigation: boolean; moisture: boolean; system: boolean };
}
export interface AppState { loaded: boolean; fields: Field[]; logs: IrrigationLog[]; notices: Notice[]; profile: Profile; selectedFieldId?: string | undefined }

const KEY = "croppulse-v1";
const defaultProfile: Profile = {
  name: "Farmer", email: "", tempUnit: "C", volumeUnit: "L", defaultLocation: "",
  notify: { rain: true, irrigation: true, moisture: true, system: true },
};
const empty: AppState = { loaded: false, fields: [], logs: [], notices: [], profile: defaultProfile };
let state: AppState = empty;
const listeners = new Set<() => void>();

function emit() {
  if (state.loaded) {
    const { loaded: _l, ...persist } = state;
    localStorage.setItem(KEY, JSON.stringify(persist));
  }
  listeners.forEach((l) => l());
}
export function loadStore() {
  if (state.loaded) return;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    state = { ...empty, ...parsed, profile: { ...defaultProfile, ...parsed.profile }, loaded: true };
  } catch {
    state = { ...empty, loaded: true };
  }
  emit();
}
const set = (fn: (s: AppState) => AppState) => { state = fn(state); emit(); };
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function useStore<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => sel(state),
    () => sel(empty),
  );
}

export const actions = {
  saveField(f: Field) {
    set((s) => {
      const exists = s.fields.some((x) => x.id === f.id);
      return { ...s, fields: exists ? s.fields.map((x) => (x.id === f.id ? f : x)) : [...s.fields, f], selectedFieldId: f.id };
    });
  },
  deleteField(id: string) {
    set((s) => ({ ...s, fields: s.fields.filter((f) => f.id !== id), logs: s.logs.filter((l) => l.fieldId !== id), selectedFieldId: s.selectedFieldId === id ? undefined : s.selectedFieldId }));
  },
  selectField(id: string) { set((s) => ({ ...s, selectedFieldId: id })); },
  addLog(l: Omit<IrrigationLog, "id">) { set((s) => ({ ...s, logs: [...s.logs, { ...l, id: uid() }] })); },
  deleteLog(id: string) { set((s) => ({ ...s, logs: s.logs.filter((l) => l.id !== id) })); },
  notify(n: Omit<Notice, "id" | "ts" | "read">) {
    set((s) => {
      if (!s.profile.notify[n.kind]) return s;
      if (n.key && s.notices.some((x) => x.key === n.key)) return s;
      return { ...s, notices: [{ ...n, id: uid(), ts: Date.now(), read: false }, ...s.notices].slice(0, 100) };
    });
  },
  markAllRead() { set((s) => ({ ...s, notices: s.notices.map((n) => ({ ...n, read: true })) })); },
  dismiss(id: string) { set((s) => ({ ...s, notices: s.notices.filter((n) => n.id !== id) })); },
  updateProfile(p: Partial<Profile>) { set((s) => ({ ...s, profile: { ...s.profile, ...p } })); },
  signOut() { localStorage.removeItem(KEY); state = { ...empty, loaded: true }; emit(); },
};
