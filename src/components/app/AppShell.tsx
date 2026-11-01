import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Droplets, Home, Sprout, User, X, Leaf } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { actions, loadStore, useStore } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/fields", label: "My Fields", icon: Sprout },
  { to: "/water-saved", label: "Water Saved", icon: Droplets },
  { to: "/profile", label: "Profile", icon: User },
] as const;

function useActive() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
}

export function NotificationsButton() {
  const notices = useStore((s) => s.notices);
  const unread = notices.filter((n) => !n.read).length;
  return (
    <Popover onOpenChange={(o) => !o && unread && actions.markAllRead()}>
      <PopoverTrigger asChild>
        <button aria-label="Notifications" className="relative grid size-11 place-items-center rounded-full bg-card shadow-soft transition hover:bg-secondary">
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-urgent px-1 text-[10px] font-bold text-primary-foreground">{unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">Notifications</p>
          {notices.length > 0 && <button className="text-xs text-primary" onClick={() => notices.forEach((n) => actions.dismiss(n.id))}>Clear all</button>}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notices.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>}
          {notices.map((n) => (
            <div key={n.id} className={cn("flex gap-3 border-b px-4 py-3 last:border-0", !n.read && "bg-secondary/60")}>
              <div className="flex-1">
                <p className="text-sm">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <button aria-label="Dismiss" onClick={() => actions.dismiss(n.id)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const loaded = useStore((s) => s.loaded);
  const isActive = useActive();
  useEffect(() => loadStore(), []);
  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar p-5 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-hero text-primary-foreground"><Leaf className="size-5" /></span>
          <span className="font-display text-xl font-bold text-primary-deep">CropPulse</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", isActive(n.to) ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
              <n.icon className="size-5" />{n.label}
            </Link>
          ))}
        </nav>
        <p className="mt-auto px-2 text-xs text-muted-foreground">Weather by Open-Meteo. Soil moisture values are simulated estimates.</p>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">
        {loaded ? children : <div className="grid h-64 place-items-center text-muted-foreground">Loading…</div>}
      </main>
      <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-3xl border bg-card/95 p-2 shadow-soft backdrop-blur md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium transition", isActive(n.to) ? "bg-secondary text-primary" : "text-muted-foreground")}>
            <n.icon className="size-5" />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-primary-deep md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{action}<NotificationsButton /></div>
    </div>
  );
}

export function EmptyFields() {
  return (
    <div className="card-soft animate-rise flex flex-col items-center gap-3 p-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><Sprout className="size-7" /></span>
      <h2 className="text-xl font-semibold">Register your first field</h2>
      <p className="max-w-sm text-sm text-muted-foreground">Add a field with its crop, soil and location to get live weather and irrigation advice.</p>
      <Button asChild><Link to="/fields/new">Add new field</Link></Button>
    </div>
  );
}

export function useHydratedState<T>(v: T) { return useState(v); }
