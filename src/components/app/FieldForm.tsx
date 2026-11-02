import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CROPS, METHODS, SOILS, STAGES, type CropKey, type MethodKey, type SoilKey, type StageKey } from "@/lib/agro";
import { actions, uid, useStore, type Field } from "@/lib/store";
import { searchPlaces, type GeoResult } from "@/lib/weather";

const today = () => new Date().toISOString().slice(0, 10);

function Pick<K extends string>({ label, value, onChange, options }: { label: string; value: K; onChange: (v: K) => void; options: Record<K, string> }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as K)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{(Object.keys(options) as K[]).map((k) => <SelectItem key={k} value={k}>{options[k]}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
const labels = <T extends Record<string, { label: string }>>(o: T) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.label])) as Record<keyof T & string, string>;

export function FieldForm({ initial }: { initial?: Field }) {
  const nav = useNavigate();
  const defLoc = useStore((s) => s.profile.defaultLocation);
  const [f, setF] = useState<Field>(initial ?? {
    id: uid(), name: "", location: "", lat: NaN, lon: NaN, crop: "wheat", area: 1, areaUnit: "acres",
    soil: "loamy", method: "drip", stage: "development", initialMoisture: 60, moistureSource: "estimate",
    moistureDate: today(), createdAt: Date.now(),
  });
  const up = (p: Partial<Field>) => setF((x) => ({ ...x, ...p }));
  const [q, setQ] = useState(initial?.location ?? defLoc);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [adv, setAdv] = useState(!!(initial?.rootDepth || initial?.fieldCapacity));

  useEffect(() => { if (!initial && defLoc) setQ(defLoc); }, [defLoc, initial]);

  async function find() {
    if (q.trim().length < 2) return;
    setBusy(true);
    try { const r = await searchPlaces(q.trim()); setResults(r); if (!r.length) toast.error("No places found. Try a nearby town."); }
    catch { toast.error("Location search failed. Check your connection."); }
    finally { setBusy(false); }
  }
  function gps() {
    if (!navigator.geolocation) return toast.error("Location not available on this device.");
    navigator.geolocation.getCurrentPosition(
      (p) => { up({ lat: p.coords.latitude, lon: p.coords.longitude, location: `GPS ${p.coords.latitude.toFixed(3)}, ${p.coords.longitude.toFixed(3)}` }); setResults([]); },
      () => toast.error("Couldn't get your location."),
    );
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("Give the field a name.");
    if (!Number.isFinite(f.lat)) return toast.error("Choose the field location.");
    if (!(f.area > 0)) return toast.error("Area must be greater than zero.");
    if (f.crop === "other" && !f.cropOther?.trim()) return toast.error("Enter the crop name.");
    if (f.fieldCapacity && f.wiltingPoint && f.wiltingPoint >= f.fieldCapacity) return toast.error("Wilting point must be below field capacity.");
    actions.saveField({ ...f, initialMoisture: Math.min(100, Math.max(0, f.initialMoisture)) });
    toast.success(initial ? "Field updated" : "Field added");
    nav({ to: "/fields/$id", params: { id: f.id } });
  }

  return (
    <form onSubmit={save} className="card-soft animate-rise space-y-6 p-5 md:p-7">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5"><Label>Field name</Label><Input value={f.name} onChange={(e) => up({ name: e.target.value })} placeholder="e.g. North plot" /></div>
        <div className="space-y-1.5">
          <Label>Location</Label>
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); find(); } }} placeholder="Village or town" />
            <Button type="button" variant="secondary" onClick={find} disabled={busy} aria-label="Search"><Search className="size-4" /></Button>
            <Button type="button" variant="secondary" onClick={gps} aria-label="Use my location"><MapPin className="size-4" /></Button>
          </div>
          {results.length > 0 && (
            <ul className="mt-1 max-h-52 overflow-y-auto rounded-xl border bg-card">
              {results.map((r) => {
                const name = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
                return <li key={r.id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-secondary" onClick={() => { up({ lat: r.latitude, lon: r.longitude, location: name }); setQ(name); setResults([]); }}>{name}</button></li>;
              })}
            </ul>
          )}
          {Number.isFinite(f.lat) && <p className="text-xs text-primary">✓ {f.location}</p>}
        </div>
        <Pick label="Crop" value={f.crop} onChange={(v: CropKey) => up({ crop: v })} options={labels(CROPS)} />
        {f.crop === "other" && <div className="space-y-1.5"><Label>Crop name</Label><Input value={f.cropOther ?? ""} onChange={(e) => up({ cropOther: e.target.value })} /></div>}
        <Pick label="Growth stage" value={f.stage} onChange={(v: StageKey) => up({ stage: v })} options={STAGES} />
        <div className="space-y-1.5">
          <Label>Field area</Label>
          <div className="flex gap-2">
            <Input type="number" min={0} step="0.01" value={f.area} onChange={(e) => up({ area: Number(e.target.value) })} />
            <Select value={f.areaUnit} onValueChange={(v) => up({ areaUnit: v as Field["areaUnit"] })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="acres">Acres</SelectItem><SelectItem value="hectares">Hectares</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <Pick label="Soil type" value={f.soil} onChange={(v: SoilKey) => up({ soil: v })} options={labels(SOILS)} />
        <Pick label="Irrigation method" value={f.method} onChange={(v: MethodKey) => up({ method: v })} options={labels(METHODS)} />
        <div className="space-y-1.5">
          <Label>Current soil moisture (% of available water)</Label>
          <Input type="number" min={0} max={100} value={f.initialMoisture} onChange={(e) => up({ initialMoisture: Number(e.target.value) })} />
        </div>
        <Pick label="Moisture reading from" value={f.moistureSource} onChange={(v: Field["moistureSource"]) => up({ moistureSource: v })} options={{ estimate: "My estimate", sensor: "Soil sensor" }} />
        <div className="space-y-1.5"><Label>Reading date</Label><Input type="date" max={today()} value={f.moistureDate} onChange={(e) => up({ moistureDate: e.target.value || today() })} /></div>
      </div>
      <div>
        <button type="button" className="text-sm font-medium text-primary" onClick={() => setAdv(!adv)}>{adv ? "Hide" : "Show"} advanced soil settings</button>
        {adv && (
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5"><Label>Root depth (m)</Label><Input type="number" step="0.05" value={f.rootDepth ?? ""} placeholder={String(CROPS[f.crop].rootDepth)} onChange={(e) => up({ rootDepth: e.target.value ? Number(e.target.value) : undefined })} /></div>
            <div className="space-y-1.5"><Label>Field capacity (fraction)</Label><Input type="number" step="0.01" value={f.fieldCapacity ?? ""} placeholder={String(SOILS[f.soil].fc)} onChange={(e) => up({ fieldCapacity: e.target.value ? Number(e.target.value) : undefined })} /></div>
            <div className="space-y-1.5"><Label>Wilting point (fraction)</Label><Input type="number" step="0.01" value={f.wiltingPoint ?? ""} placeholder={String(SOILS[f.soil].wp)} onChange={(e) => up({ wiltingPoint: e.target.value ? Number(e.target.value) : undefined })} /></div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => history.back()}>Cancel</Button>
        <Button type="submit">{initial ? "Save changes" : "Add field"}</Button>
      </div>
    </form>
  );
}
