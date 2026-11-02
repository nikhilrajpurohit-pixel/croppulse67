import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyFields, PageHeader } from "@/components/app/AppShell";
import { MoistureChart, RecommendationCard, WeatherPanel, useAnalysisNotices } from "@/components/app/widgets";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFieldAnalysis } from "@/lib/analysis";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "CropPulse — Smart irrigation advice for your fields" },
    { name: "description", content: "Live weather, soil moisture tracking and daily irrigation advice that saves water." },
    { property: "og:title", content: "CropPulse — Smart irrigation advice" },
    { property: "og:description", content: "Live weather, soil moisture tracking and daily irrigation advice that saves water." },
  ] }),
  component: Home,
});

function Home() {
  const fields = useStore((s) => s.fields);
  const sel = useStore((s) => s.selectedFieldId);
  const name = useStore((s) => s.profile.name);
  const logs = useStore((s) => s.logs);
  const field = fields.find((f) => f.id === sel) ?? fields[0];
  const { q, a } = useFieldAnalysis(field, logs);
  useAnalysisNotices(field, a, q.data);
  return (
    <>
      <PageHeader title={`Namaste, ${name}`} subtitle="Today's irrigation advice" action={fields.length > 1 && field ? (
        <Select value={field.id} onValueChange={(v) => actions.selectField(v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{fields.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
        </Select>
      ) : null} />
      {!field ? <EmptyFields /> : (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-3">
            {a ? <RecommendationCard field={field} a={a} /> : <div className="card-soft p-6 text-sm text-muted-foreground">{q.isError ? "Couldn't load weather. Check your connection." : "Calculating advice…"}</div>}
            {a && <MoistureChart a={a} />}
          </div>
          <div className="space-y-5 lg:col-span-2">
            <WeatherPanel q={q} />
            <Link to="/fields/$id" params={{ id: field.id }} className="block text-center text-sm font-medium text-primary">Open full field details →</Link>
          </div>
        </div>
      )}
    </>
  );
}
