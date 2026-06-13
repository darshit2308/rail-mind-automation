import { BarChart3, Map as MapIcon, Waypoints, Zap } from "lucide-react";
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
  { id: "network", label: "Network", icon: Waypoints },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  connected: "Connected",
  connecting: "Connecting…",
  disconnected: "Reconnecting",
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
  const healthStatus = health >= 80 ? "ok" : health >= 50 ? "warn" : "crit";
  
  return (
    <header className="control-bar">
      {/* Brand */}
      <div className="control-bar__brand">
        <div className="control-bar__logomark">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="10" width="12" height="1.8" rx="0.9" fill="white" />
            <rect x="4.5" y="3.5" width="7" height="5.5" rx="1.2" fill="none" stroke="white" strokeWidth="1.4" />
            <rect x="4" y="11.8" width="1.8" height="2.2" rx="0.6" fill="rgba(255,255,255,0.5)" />
            <rect x="10.2" y="11.8" width="1.8" height="2.2" rx="0.6" fill="rgba(255,255,255,0.5)" />
          </svg>
        </div>
        <div>
          <h1 className="control-bar__brandname">
            Rail<em>Mind</em>
          </h1>
          <p className="control-bar__sub">
            Control Room
          </p>
        </div>
      </div>

      <div className="control-bar__div" />

      {/* Navigation */}
      <nav className="control-bar__nav">
        {VIEWS.map((v) => {
          const active = view === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onView(v.id)}
              className={`nav-tab ${active ? "nav-tab--active" : ""}`}
            >
              <v.icon className="nav-tab__icon" />
              {v.label}
            </button>
          );
        })}
      </nav>

      {/* Right cluster */}
      <div className="control-bar__right">
        {/* Clock */}
        <span className="control-bar__clock">
          {clock}
        </span>

        {/* Health */}
        <div className="health-pill">
          <span className={`health-pill__dot health-pill__dot--${healthStatus}`} />
          <span className="health-pill__val" style={{ color: `var(--${healthStatus})` }}>
            {health}%
          </span>
          <span className="health-pill__lbl">health</span>
        </div>

        {/* Connection */}
        <div className={`conn-bars conn-bars--${connectionStatus}`}>
          <div className="conn-bars__track">
            <div className="conn-bars__bar" />
            <div className="conn-bars__bar" />
            <div className="conn-bars__bar" />
          </div>
          <span className="conn-bars__lbl">
            {CONNECTION_LABEL[connectionStatus]}
          </span>
        </div>

        {/* Speed controls */}
        <div className="speed-ctrl">
          <span className="speed-ctrl__label">Speed</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              className={`speed-btn ${speed === s ? "speed-btn--active" : ""}`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Demo trigger */}
        <button
          onClick={onDemo}
          disabled={demoRunning}
          className="trigger-btn"
        >
          <Zap className="trigger-btn__icon" />
          <span>
            {demoRunning ? "Demo running…" : "Trigger incident"}
          </span>
        </button>
      </div>
    </header>
  );
}