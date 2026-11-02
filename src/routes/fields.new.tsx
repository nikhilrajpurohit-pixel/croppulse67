import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/AppShell";
import { FieldForm } from "@/components/app/FieldForm";

export const Route = createFileRoute("/fields/new")({
  head: () => ({ meta: [
    { title: "Add a field · CropPulse" },
    { name: "description", content: "Register a field with crop, soil, area and location for irrigation advice." },
    { property: "og:title", content: "Add a field · CropPulse" },
    { property: "og:description", content: "Register a field for weather-based irrigation advice." },
  ] }),
  component: () => (
    <>
      <PageHeader title="Add new field" subtitle="Tell us about the field so we can track its soil water." />
      <FieldForm />
    </>
  ),
});
