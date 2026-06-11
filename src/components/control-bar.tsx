import { BarChart3, Map as MapIcon, TrainFront, Waypoints, Wifi, WifiOff, Zap } from "lucide-react";
import type { ConnectionStatus } from "@/lib/sim/types";

export type ViewId = "map" | "network" | "analytics";

interface ControlBarProps {
  clock: string;
  health: number;
  connectionStatus: ConnectionStatus;
  speed: number;
  onSpeed: (s: number) => void;
  onDemo: () => void;
  demoRunning: boolean;
  view: ViewId;
  onView: (v: ViewId) => void;
}

const SPEEDS = [1, 2, 5];

const VIEWS: { id: ViewId; label: string; icon: typeof MapIcon }[] = [
  { id: "map", label: "Live Map", icon: MapIcon },
  { id: "network", label: "Network View", icon: Waypoints },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  connected: "Backend connected",
  connecting: "Connecting…",
  disconnected: "Reconnecting…",
};

export function ControlBar({
  clock,
  health,
  connectionStatus,
  speed,
  onSpeed,
  onDemo,
  demoRunning,
  view,
  onView,
}: ControlBarProps) {
  const healthTone =
    health >= 80
      ? "bg-success/15 text-success"
      : health >= 50
        ? "bg-warning/15 text-warning"
        : "bg-destructive/15 text-destructive";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-3 backdrop-blur md:px-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <TrainFront className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <h1 className="font-display text-base font-bold tracking-tight">RailMind</h1>
          <p className="hidden font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
            Control Room
          </p>
        </div>
      </div>

      <nav className="mx-auto hidden items-center gap-1 rounded-lg border border-border bg-background/50 p-0.5 md:flex">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => onView(v.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
              view === v.id
                ? "border border-border bg-card text-foreground"
                : "border border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <v.icon className="h-3.5 w-3.5" />
            {v.label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-3">
        <span className="hidden font-mono text-xs text-muted-foreground xl:block">{clock}</span>

        <span
          className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide sm:flex ${healthTone}`}
          title="Network health score"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          NETWORK HEALTH {health}%
        </span>

        <span
          className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide sm:flex ${
            connectionStatus === "connected"
              ? "bg-success/15 text-success"
              : connectionStatus === "connecting"
                ? "bg-warning/15 text-warning"
                : "bg-destructive/15 text-destructive"
          }`}
          title={CONNECTION_LABEL[connectionStatus]}
        >
          {connectionStatus === "connected" ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {CONNECTION_LABEL[connectionStatus]}
        </span>

        <span className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide text-destructive">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive rm-blink" />
          LIVE
        </span>

        <div className="hidden overflow-hidden rounded-md border border-border lg:flex">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              className={`px-2.5 py-1 font-mono text-xs transition-colors ${
                speed === s
                  ? "bg-primary/20 font-bold text-primary"
                  : "bg-background/60 text-muted-foreground hover:text-foreground"
              }`}
              title={`${s}× simulation speed (press ${s})`}
            >
              {s}×
            </button>
          ))}
        </div>

        <button
          onClick={onDemo}
          disabled={demoRunning}
          className={`flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50 ${
            demoRunning ? "" : "rm-demo-pulse"
          }`}
          title="Press D"
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {demoRunning ? "Demo running…" : "Trigger Demo Incident"}
          </span>
        </button>
      </div>
    </header>
  );
}
