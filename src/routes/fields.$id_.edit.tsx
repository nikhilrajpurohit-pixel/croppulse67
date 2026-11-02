import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/AppShell";
import { FieldForm } from "@/components/app/FieldForm";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/fields/$id_/edit")({
  head: () => ({ meta: [
    { title: "Edit field · CropPulse" },
    { name: "description", content: "Update a field's crop, stage, soil and moisture." },
    { property: "og:title", content: "Edit field · CropPulse" },
    { property: "og:description", content: "Update a field's details." },
  ] }),
  component: Edit,
});

function Edit() {
  const { id } = Route.useParams();
  const f = useStore((s) => s.fields.find((x) => x.id === id));
  if (!f) return <p className="text-muted-foreground">Field not found. <Link to="/fields" className="text-primary">Back to fields</Link></p>;
  return (<><PageHeader title={`Edit ${f.name}`} /><FieldForm initial={f} /></>);
}
