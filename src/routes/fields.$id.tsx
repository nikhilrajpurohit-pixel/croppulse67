import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { FieldFacts, IrrigationHistory, MoistureChart, RecommendationCard, WeatherPanel, useAnalysisNotices } from "@/components/app/widgets";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useFieldAnalysis } from "@/lib/analysis";
import { actions, useStore } from "@/lib/store";

export const Route = createFileRoute("/fields/$id")({
  head: () => ({ meta: [
    { title: "Field details · CropPulse" },
    { name: "description", content: "Soil moisture, weather and irrigation advice for your field." },
    { property: "og:title", content: "Field details · CropPulse" },
    { property: "og:description", content: "Soil moisture, weather and irrigation advice for your field." },
  ] }),
  component: FieldPage,
});

function FieldPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const field = useStore((s) => s.fields.find((f) => f.id === id));
  const logs = useStore((s) => s.logs);
  const { q, a } = useFieldAnalysis(field, logs);
  useAnalysisNotices(field, a, q.data);
  useEffect(() => { if (field) actions.selectField(field.id); }, [field?.id]);
  if (!field) return <p className="text-muted-foreground">Field not found. <Link to="/fields" className="text-primary">Back to fields</Link></p>;
  return (
    <>
      <PageHeader title={field.name} subtitle={field.location} action={
        <>
          <Button asChild variant="secondary" size="icon" aria-label="Edit"><Link to="/fields/$id/edit" params={{ id }}><Pencil className="size-4" /></Link></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="secondary" size="icon" aria-label="Delete"><Trash2 className="size-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Delete {field.name}?</AlertDialogTitle><AlertDialogDescription>This removes the field and its irrigation records.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { actions.deleteField(id); nav({ to: "/fields" }); }}>Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      } />
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          {a ? <RecommendationCard field={field} a={a} /> : <div className="card-soft p-6 text-sm text-muted-foreground">{q.isError ? "Couldn't load weather for this field." : "Calculating advice…"}</div>}
          {a && <MoistureChart a={a} />}
          <IrrigationHistory field={field} />
        </div>
        <div className="space-y-5 lg:col-span-2">
          <WeatherPanel q={q} />
          <FieldFacts field={field} />
        </div>
      </div>
    </>
  );
}
