import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { actions, useStore, type Profile } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "Profile & settings · CropPulse" },
    { name: "description", content: "Your name, units, default location and notification preferences." },
    { property: "og:title", content: "Profile & settings · CropPulse" },
    { property: "og:description", content: "Units, location and notification preferences." },
  ] }),
  component: ProfilePage,
});

function Toggle<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-secondary p-1">
      {options.map(([k, l]) => <button key={k} type="button" onClick={() => onChange(k)} className={`rounded-lg px-4 py-1.5 text-sm font-medium ${value === k ? "bg-card shadow-soft" : "text-muted-foreground"}`}>{l}</button>)}
    </div>
  );
}

function ProfilePage() {
  const p = useStore((s) => s.profile);
  const up = (x: Partial<Profile>) => actions.updateProfile(x);
  const kinds: [keyof Profile["notify"], string][] = [["rain", "Rain alerts"], ["irrigation", "Irrigation reminders"], ["moisture", "Low moisture warnings"], ["system", "App updates"]];
  return (
    <>
      <PageHeader title="Profile" subtitle="Changes save automatically on this device" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-soft space-y-4 p-5">
          <h2 className="text-lg font-semibold">About you</h2>
          <div className="space-y-1.5"><Label>Name</Label><Input value={p.name} onChange={(e) => up({ name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={p.email} onChange={(e) => up({ email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Default location for new fields</Label><Input value={p.defaultLocation} onChange={(e) => up({ defaultLocation: e.target.value })} placeholder="e.g. Jaipur" /></div>
        </section>
        <section className="card-soft space-y-4 p-5">
          <h2 className="text-lg font-semibold">Units</h2>
          <div className="flex items-center justify-between"><span className="text-sm">Temperature</span><Toggle value={p.tempUnit} options={[["C", "°C"], ["F", "°F"]]} onChange={(v) => up({ tempUnit: v })} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Water volume</span><Toggle value={p.volumeUnit} options={[["L", "Litres"], ["m3", "m³"]]} onChange={(v) => up({ volumeUnit: v })} /></div>
          <h2 className="pt-2 text-lg font-semibold">Notifications</h2>
          {kinds.map(([k, l]) => (
            <div key={k} className="flex items-center justify-between"><span className="text-sm">{l}</span><Switch checked={p.notify[k]} onCheckedChange={(c) => up({ notify: { ...p.notify, [k]: c } })} /></div>
          ))}
        </section>
      </div>
      <div className="mt-6">
        <Button variant="destructive" onClick={() => { if (confirm("Erase all fields, records and settings on this device?")) { actions.signOut(); toast.success("All data cleared"); } }}>Clear all data</Button>
      </div>
    </>
  );
}
