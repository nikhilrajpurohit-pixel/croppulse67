import { useEffect, useMemo, useState } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Droplet, Droplets, Info, RefreshCw, Thermometer, Wind } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { METHODS, kcFor, soilProfile } from "@/lib/agro";
import { cropName, fmtTemp, fmtVol, type Analysis } from "@/lib/analysis";
import { actions, useStore, type Field } from "@/lib/store";
import { weatherLabel, type WeatherData } from "@/lib/weather";
import { LevelChip, Stat, WeatherIcon, fmtDay, levelStyle } from "./bits";
import { cn } from "@/lib/utils";

export function WeatherPanel({ q, compact }: { q: UseQueryResult<WeatherData>; compact?: boolean }) {
  const unit = useStore((s) => s.profile.tempUnit);
  const w = q.data;
  return (
    <section className="card-soft animate-rise p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Weather</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {w && <span>Updated {new Date(w.fetchedAt).toLocaleTimeString("en-IN", { timeStyle: "short" })}</span>}
          <Button size="icon" variant="ghost" aria-label="Refresh weather" disabled={q.isFetching}
            onClick={async () => { const r = await q.refetch(); if (r.isSuccess) { toast.success("Weather refreshed"); actions.notify({ kind: "system", message: "Weather data successfully refreshed." }); } else toast.error("Could not refresh weather"); }}>
            <RefreshCw className={cn("size-4", q.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>
      {q.isError && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-urgent/10 p-3 text-sm text-urgent">
          <AlertTriangle className="size-4" />{w ? "Refresh failed — showing the last successful data (may be stale)." : "Live weather is unavailable right now. Try refreshing."}
        </div>
      )}
      {!w && q.isLoading && <div className="mt-4 h-40 animate-pulse rounded-2xl bg-muted" />}
      {w && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-3">
              <WeatherIcon code={w.current.code} className="size-12 text-primary" />
              <div>
                <p className="font-display text-4xl font-bold">{fmtTemp(w.current.temp, unit)}</p>
                <p className="text-sm text-muted-foreground">{weatherLabel(w.current.code)}</p>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-3 gap-2">
              <Stat label="Humidity" value={`${w.current.humidity}%`} />
              <Stat label="Wind" value={`${Math.round(w.current.wind)} km/h`} />
              <Stat label="Rain today" value={`${w.todayDay.rain.toFixed(1)} mm`} />
            </div>
          </div>
          {!compact && (
            <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1">
              {w.forecast.slice(0, 7).map((d) => (
                <div key={d.date} className="min-w-[96px] flex-1 rounded-2xl bg-muted p-3 text-center">
                  <p className="text-xs font-medium">{fmtDay(d.date)}</p>
                  <WeatherIcon code={d.code} className="mx-auto my-2 size-6 text-primary" />
                  <p className="text-sm font-semibold">{fmtTemp(d.tmax, unit)} <span className="font-normal text-muted-foreground">{fmtTemp(d.tmin, unit)}</span></p>
                  <p className="mt-1 text-[11px] text-water">{d.rainProb ?? "–"}% · {d.rain.toFixed(1)} mm</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function RecommendationCard({ field, a }: { field: Field; a: Analysis }) {
  const unit = useStore((s) => s.profile.volumeUnit);
  const r = a.rec;
  const st = levelStyle[r.level];
  const pctFull = Math.round((r.storage / r.taw) * 100);
  return (
    <section className="card-soft animate-rise overflow-hidden">
      <div className={cn("h-1.5", st.bar)} />
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{r.title}</h2>
          <LevelChip level={r.level} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{r.reason}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Est. soil moisture" value={`${r.moisture.toFixed(1)}%`} sub={`${pctFull}% of available water · simulated`} />
          <Stat label="Crop demand today" value={`${r.etcToday.toFixed(1)} mm`} sub="ETc = Kc × ET0" />
          <Stat label="Recommended" value={`${r.grossMm.toFixed(1)} mm`} sub={fmtVol(r.litres, unit)} />
          <Stat label="Rain next 48 h" value={`${r.rainNext48.toFixed(1)} mm`} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <DetailsDialog field={field} a={a} />
          <LogIrrigation field={field} suggested={r.grossMm} />
        </div>
      </div>
    </section>
  );
}

function DetailsDialog({ field, a }: { field: Field; a: Analysis }) {
  const unit = useStore((s) => s.profile.volumeUnit);
  const p = soilProfile(a.params);
  const r = a.rec;
  const m = METHODS[field.method];
  const rows: [string, string][] = [
    ["Root depth (Zr)", `${p.zr.toFixed(2)} m`],
    ["Field capacity / wilting point", `${(p.fc * 100).toFixed(0)}% / ${(p.wp * 100).toFixed(0)}%`],
    ["Total available water (TAW)", `${p.taw.toFixed(1)} mm`],
    ["Readily available water (RAW)", `${p.raw.toFixed(1)} mm`],
    ["Current stored water (S)", `${r.storage.toFixed(1)} mm`],
    ["Depletion (TAW − S)", `${r.deficitMm.toFixed(1)} mm`],
    ["Crop coefficient (Kc)", kcFor(field.crop, field.stage).toFixed(2)],
    ["Today's crop demand (ETc)", `${r.etcToday.toFixed(2)} mm`],
    ["Forecast rain, 48 h", `${r.rainNext48.toFixed(1)} mm`],
    ["Net irrigation need", `${r.netMm.toFixed(1)} mm`],
    [`Gross at ${(m.efficiency * 100).toFixed(0)}% efficiency`, `${r.grossMm.toFixed(1)} mm`],
    ["Volume (depth × area)", `${fmtVol(r.litres, unit)} over ${Math.round(a.params.areaM2).toLocaleString("en-IN")} m²`],
    ["Est. saving vs fixed schedule", fmtVol(r.savedLitres, unit)],
  ];
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline"><Info className="size-4" />View details</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle>How this was calculated</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Daily root-zone balance: S(t) = S(t−1) + effective rain + irrigation − ETc − drainage − runoff. ET0 comes from Open-Meteo (FAO-56 Penman-Monteith). Soil moisture is a <b>simulated estimate</b> starting from your {field.moistureSource === "sensor" ? "sensor reading" : "manual estimate"} on {fmtDay(field.moistureDate)}.</p>
        <dl className="mt-2 divide-y text-sm">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
        </dl>
        <p className="text-xs text-muted-foreground">Irrigation is advised when depletion exceeds RAW and forecast effective rain for 48 h won't cover it. Rain under 5 mm is treated as ineffective; 80% of larger rain counts.</p>
      </DialogContent>
    </Dialog>
  );
}

function LogIrrigation({ field, suggested }: { field: Field; suggested: number }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [mm, setMm] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setMm(suggested > 0 ? suggested.toFixed(1) : ""); }}>
      <DialogTrigger asChild><Button><Droplets className="size-4" />Log irrigation</Button></DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle>Record irrigation for {field.name}</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const v = Number(mm);
          if (!(v > 0 && v < 300)) return toast.error("Enter a depth between 0 and 300 mm");
          if (date > today || date < field.moistureDate) return toast.error("Date must be between the moisture start date and today");
          actions.addLog({ fieldId: field.id, date, appliedMm: v, recommendedMm: suggested });
          toast.success("Irrigation recorded"); setOpen(false);
        }}>
          <label className="block text-sm">Date<Input type="date" value={date} max={today} min={field.moistureDate} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="block text-sm">Water applied (mm depth at field)<Input type="number" step="0.1" value={mm} onChange={(e) => setMm(e.target.value)} /></label>
          <Button type="submit" className="w-full">Save record</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MoistureChart({ a }: { a: Analysis }) {
  const [range, setRange] = useState(14);
  const data = useMemo(() => {
    const from = Math.max(0, a.todayIdx - range);
    return a.sim.slice(from).map((d) => ({
      date: fmtDay(d.date),
      history: d.isForecast ? null : +d.moisture.toFixed(2),
      projection: d.isForecast || d.date === a.sim[a.todayIdx]?.date ? +d.moisture.toFixed(2) : null,
      rain: +d.rain.toFixed(1),
      demand: +d.etc.toFixed(2),
      irrigation: +d.irrigationGross.toFixed(1),
    }));
  }, [a, range]);
  const p = soilProfile(a.params);
  const thr = (p.wp + (p.taw - p.raw) / (p.zr * 1000)) * 100;
  return (
    <section className="card-soft animate-rise p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Soil moisture (simulated)</h2>
          <p className="text-xs text-muted-foreground">Solid = estimate from observed weather · dashed = forecast projection</p>
        </div>
        <div className="flex rounded-full bg-muted p-1">
          {[7, 14, 30].map((r) => <button key={r} onClick={() => setRange(r)} className={cn("rounded-full px-3 py-1 text-xs font-medium", range === r ? "bg-card shadow-soft" : "text-muted-foreground")}>{r} days</button>)}
        </div>
      </div>
      {a.todayIdx === 0 && <p className="mt-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground">History starts from the moisture date you entered. Set an earlier date on the field to see past estimates.</p>}
      <div className="mt-4 h-72">
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis yAxisId="m" tick={{ fontSize: 11 }} unit="%" domain={["auto", "auto"]} />
            <YAxis yAxisId="mm" orientation="right" tick={{ fontSize: 11 }} unit="mm" />
            <Tooltip contentStyle={{ borderRadius: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="mm" dataKey="rain" name="Rain (mm)" fill="var(--water)" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="mm" dataKey="irrigation" name="Irrigation (mm)" fill="var(--rec)" radius={[4, 4, 0, 0]} />
            <Line yAxisId="mm" dataKey="demand" name="Crop demand (mm)" stroke="var(--chart-5)" dot={false} strokeWidth={1.5} />
            <Area yAxisId="m" dataKey="history" name="Moisture %" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.12} strokeWidth={2.5} connectNulls={false} />
            <Line yAxisId="m" dataKey="projection" name="Projection %" stroke="var(--primary)" strokeDasharray="6 4" dot={false} strokeWidth={2} />
            <ReferenceLine yAxisId="m" y={thr} stroke="var(--rec)" strokeDasharray="3 3" label={{ value: "stress", fontSize: 10, fill: "var(--rec)" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function FieldFacts({ field }: { field: Field }) {
  return (
    <section className="card-soft p-5">
      <h2 className="text-lg font-semibold">Field profile</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        <Stat label="Crop" value={cropName(field)} sub={`Kc ${kcFor(field.crop, field.stage).toFixed(2)}`} />
        <Stat label="Growth stage" value={field.stage === "mid" ? "Mid-season" : field.stage[0].toUpperCase() + field.stage.slice(1)} />
        <Stat label="Area" value={`${field.area} ${field.areaUnit}`} />
        <Stat label="Soil" value={field.soil[0].toUpperCase() + field.soil.slice(1)} />
        <Stat label="Method" value={METHODS[field.method].label.replace(" irrigation", "")} sub={`${METHODS[field.method].efficiency * 100}% efficient`} />
        <Stat label="Start moisture" value={`${field.initialMoisture}%`} sub={field.moistureSource === "sensor" ? "Sensor reading" : "Manual estimate"} />
      </div>
    </section>
  );
}

export function IrrigationHistory({ field }: { field: Field }) {
  const logs = useStore((s) => s.logs).filter((l) => l.fieldId === field.id).sort((x, y) => y.date.localeCompare(x.date));
  const unit = useStore((s) => s.profile.volumeUnit);
  const m2 = field.areaUnit === "acres" ? field.area * 4046.86 : field.area * 10000;
  return (
    <section className="card-soft p-5">
      <h2 className="text-lg font-semibold">Irrigation records</h2>
      {logs.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No irrigation recorded yet. Use "Log irrigation" after watering.</p>}
      <ul className="mt-3 divide-y">
        {logs.map((l) => (
          <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm">
            <Droplet className="size-4 text-water" />
            <span className="flex-1">{fmtDay(l.date)} · <b>{l.appliedMm} mm</b> applied ({fmtVol(l.appliedMm * m2, unit)}) · advised {l.recommendedMm.toFixed(1)} mm</span>
            <button className="text-xs text-destructive" onClick={() => actions.deleteLog(l.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Push in-app notifications derived from the latest analysis (deduplicated by key per day). */
export function useAnalysisNotices(field: Field | undefined, a: Analysis | undefined, w: WeatherData | undefined) {
  useEffect(() => {
    if (!field || !a || !w) return;
    const tm = w.forecast[0];
    if (tm && tm.rain >= 5) actions.notify({ kind: "rain", key: `rain-${field.id}-${tm.date}`, message: `Rainfall of ${tm.rain.toFixed(1)} mm expected tomorrow at ${field.name}.` });
    if (a.rec.level === "now" || a.rec.level === "urgent") actions.notify({ kind: "irrigation", key: `irr-${field.id}-${w.today}`, message: `Irrigation recommended for ${field.name}: about ${a.rec.grossMm.toFixed(1)} mm.` });
    if (a.rec.level === "soon") actions.notify({ kind: "moisture", key: `moist-${field.id}-${w.today}`, message: `Soil moisture at ${field.name} is approaching the lower threshold.` });
  }, [field, a?.rec.level, w?.today]);
}

export { Thermometer, Wind };
