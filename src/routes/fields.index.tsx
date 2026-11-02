import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { EmptyFields, PageHeader } from "@/components/app/AppShell";
import { LevelChip } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { cropName, useAllAnalyses } from "@/lib/analysis";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/fields/")({
  head: () => ({ meta: [
    { title: "My fields · CropPulse" },
    { name: "description", content: "All your registered fields and their irrigation status." },
    { property: "og:title", content: "My fields · CropPulse" },
    { property: "og:description", content: "All your registered fields and their irrigation status." },
  ] }),
  component: Fields,
});

function Fields() {
  const fields = useStore((s) => s.fields);
  const logs = useStore((s) => s.logs);
  const rows = useAllAnalyses(fields, logs);
  return (
    <>
      <PageHeader title="My fields" subtitle={`${fields.length} registered`} action={<Button asChild><Link to="/fields/new"><Plus className="size-4" />Add field</Link></Button>} />
      {fields.length === 0 ? <EmptyFields /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ field, a, q }) => (
            <Link key={field.id} to="/fields/$id" params={{ id: field.id }} className="card-soft animate-rise block p-5 transition hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-2">
                <div><h2 className="text-lg font-semibold">{field.name}</h2><p className="text-xs text-muted-foreground">{field.location}</p></div>
                {a && <LevelChip level={a.rec.level} />}
              </div>
              <p className="mt-3 text-sm">{cropName(field)} · {field.area} {field.areaUnit}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {a ? `Soil water ${Math.round((a.rec.storage / a.rec.taw) * 100)}% of available` : q.isError ? "Weather unavailable" : "Loading…"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
