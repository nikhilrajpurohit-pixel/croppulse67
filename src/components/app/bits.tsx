import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from "lucide-react";
import type { RecLevel } from "@/lib/agro";
import { cn } from "@/lib/utils";

export function WeatherIcon({ code, className }: { code: number; className?: string }) {
  const I = code === 0 ? Sun : code <= 2 ? CloudSun : code === 3 ? Cloud : code <= 48 ? CloudFog : code <= 57 ? CloudDrizzle : code <= 67 ? CloudRain : code <= 77 ? CloudSnow : code <= 82 ? CloudRain : CloudLightning;
  return <I className={className} />;
}

export const levelStyle: Record<RecLevel, { chip: string; bar: string; label: string }> = {
  none: { chip: "bg-ok/15 text-ok", bar: "bg-ok", label: "No irrigation required" },
  soon: { chip: "bg-soon/25 text-foreground", bar: "bg-soon", label: "May be needed soon" },
  now: { chip: "bg-rec/20 text-rec", bar: "bg-rec", label: "Irrigation recommended" },
  urgent: { chip: "bg-urgent/15 text-urgent", bar: "bg-urgent", label: "Urgent attention" },
};

export function LevelChip({ level, className }: { level: RecLevel; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", levelStyle[level].chip, className)}><span className={cn("size-2 rounded-full", levelStyle[level].bar)} />{levelStyle[level].label}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export const fmtDay = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
