import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyFields, PageHeader } from "@/components/app/AppShell";
import { Stat } from "@/components/app/bits";
import { fmtVol, useAllAnalyses } from "@/lib/analysis";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/water-saved")({
  head: () => ({ meta: [
    { title: "Water saved · CropPulse" },
    { name: "description", content: "How much water weather-based irrigation saves compared to a fixed schedule." },
    { property: "og:title", content: "Water saved · CropPulse" },
    { property: "og:description", content: "Water savings compared to a fixed irrigation schedule." },
  ] }),
  component: WaterSaved,
});

function WaterSaved() {
  const fields = useStore((s) => s.fields);
  const logs = useStore((s) => s.logs);
  const unit = useStore((s) => s.profile.volumeUnit);
  const rows = useAllAnalyses(fields, logs);
  const byDate: Record<string, { date: string; traditional: number; croppulse: number }> = {};
  let trad = 0, cp = 0;
  rows.forEach(({ a }) => a?.savings.forEach((d) => {
    const r = (byDate[d.date] ??= { date: d.date, traditional: 0, croppulse: 0 });
    r.traditional += d.traditionalL; r.croppulse += d.croppulseL; trad += d.traditionalL; cp += d.croppulseL;
  }));
  const data = Object.values(byDate).sort((x, y) => x.date.localeCompare(y.date));
  const k = unit === "m3" ? 1000 : 1;
  const saved = trad - cp;
  return (
    <>
      <PageHeader title="Water saved" subtitle="CropPulse advice vs. a fixed traditional schedule, since each field's moisture reading" />
      {fields.length === 0 ? <EmptyFields /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Traditional schedule" value={fmtVol(trad, unit)} />
            <Stat label="With CropPulse" value={fmtVol(cp, unit)} />
            <Stat label="Water saved" value={fmtVol(saved, unit)} sub={trad > 0 ? `${Math.round((saved / trad) * 100)}% less` : undefined} />
          </div>
          <section className="card-soft p-5">
            <h2 className="text-lg font-semibold">Daily water use ({unit === "m3" ? "m³" : "litres"})</h2>
            {data.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Savings appear after your first full day of tracking.</p> : (
              <div className="mt-4 h-72">
                <ResponsiveContainer>
                  <BarChart data={data.map((d) => ({ ...d, traditional: d.traditional / k, croppulse: d.croppulse / k }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v: number) => Math.round(v).toLocaleString("en-IN")} />
                    <Legend />
                    <Bar dataKey="traditional" name="Traditional" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="croppulse" name="CropPulse" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
          <section className="card-soft p-5">
            <h2 className="text-lg font-semibold">By field</h2>
            <ul className="mt-3 divide-y text-sm">
              {rows.map(({ field, a }) => {
                const t = a?.savings.reduce((s, d) => s + d.traditionalL, 0) ?? 0;
                const c = a?.savings.reduce((s, d) => s + d.croppulseL, 0) ?? 0;
                return <li key={field.id} className="flex justify-between py-2.5"><span>{field.name}</span><b>{a ? fmtVol(t - c, unit) : "…"}</b></li>;
              })}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
