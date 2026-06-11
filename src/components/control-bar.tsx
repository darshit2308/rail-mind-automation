import { Activity, BarChart3, Map as MapIcon, TrainFront, Zap } from "lucide-react";

interface ControlBarProps {
  clock: string;
  health: number;
  activeIncidents: number;
  speed: number;
  onSpeed: (s: number) => void;
  onDemo: () => void;
  demoRunning: boolean;
  view: "ops" | "analytics";
  onView: (v: "ops" | "analytics") => void;
}

const SPEEDS = [1, 2, 5];

export function ControlBar({
  clock,
  health,
  activeIncidents,
  speed,
  onSpeed,
  onDemo,
  demoRunning,
  view,
  onView,
}: ControlBarProps) {
  const healthColor =
    health >= 85 ? "text-success" : health >= 60 ? "text-warning" : "text-destructive";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-3 backdrop-blur md:px-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <TrainFront className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <h1 className="font-display text-base font-bold tracking-tight">RailMind</h1>
          <p className="hidden font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
            The Brain Behind Every Train
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <span className="hidden font-mono text-xs text-muted-foreground lg:block">{clock}</span>

        <span
          className={`flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-xs font-semibold ${healthColor}`}
          title="Network health score"
        >
          <Activity className="h-3.5 w-3.5" />
          {health}
        </span>

        <span
          className={`hidden items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-xs sm:flex ${
            activeIncidents > 0 ? "text-destructive" : "text-muted-foreground"
          }`}
          title="Active incidents"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              activeIncidents > 0 ? "bg-destructive rm-blink" : "bg-success"
            }`}
          />
          {activeIncidents} active
        </span>

        <div className="hidden overflow-hidden rounded-md border border-border md:flex">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              className={`px-2.5 py-1 font-mono text-xs transition-colors ${
                speed === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="flex overflow-hidden rounded-md border border-border">
          <button
            onClick={() => onView("ops")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors ${
              view === "ops"
                ? "bg-secondary text-foreground"
                : "bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Control Room</span>
          </button>
          <button
            onClick={() => onView("analytics")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors ${
              view === "analytics"
                ? "bg-secondary text-foreground"
                : "bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Analytics</span>
          </button>
        </div>

        <button
          onClick={onDemo}
          disabled={demoRunning}
          className="flex items-center gap-1.5 rounded-md bg-agent px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Zap className="h-3.5 w-3.5" />
          {demoRunning ? "Scenario running…" : "Demo Scenario"}
        </button>
      </div>
    </header>
  );
}
