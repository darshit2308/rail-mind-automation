import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { AgentPanel } from "@/components/agent-panel";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { ControlBar, type ViewId } from "@/components/control-bar";
import { IncidentFeed } from "@/components/incident-feed";
import { ResolutionModal } from "@/components/resolution-modal";
import { StatsBar } from "@/components/stats-bar";
import { useSimulation } from "@/hooks/use-simulation";
import type { SimEngine } from "@/lib/sim/engine";

const RailMap = lazy(() => import("@/components/rail-map"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RailMind — Smart Rail Control Room" },
      {
        name: "description",
        content:
          "Five autonomous AI agents monitor, decide and resolve railway incidents in seconds. Watch the live multi-agent control room.",
      },
      { property: "og:title", content: "RailMind — Smart Rail Control Room" },
      {
        property: "og:description",
        content:
          "A multi-agent AI system that autonomously monitors, decides, and resolves railway incidents — without human intervention.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <main className="app-shell" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", gap: "4px" }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  animation: `rm-blink 1.2s ease-in-out ${i * 0.2}s infinite`
                }}
              />
            ))}
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-muted)" }}>
            Initializing control room
          </p>
        </div>
      </main>
    );
  }
  return <ControlRoom />;
}

const LEGEND = [
  { label: "On time", color: "var(--ok)" },
  { label: "Delayed", color: "var(--warn)" },
  { label: "Critical", color: "var(--crit)" },
  { label: "Rerouting", color: "var(--accent)" },
] as const;

const TRACK_LEGEND = [
  { label: "Clear", color: "var(--ok)" },
  { label: "Restricted / slow", color: "var(--warn)" },
  { label: "Blocked", color: "var(--crit)" },
] as const;

function MapStatsOverlay({ engine }: { engine: SimEngine }) {
  const onTime = engine.trains.filter((t) => t.status === "on_time").length;
  const onTimePct = Math.round((onTime / Math.max(engine.trains.length, 1)) * 100);
  return (
    <div className="rm-overlay-panel" style={{ position: "absolute", bottom: "12px", left: "12px", zIndex: 1000, padding: "10px 12px", pointerEvents: "none" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px" }}>
        {[
          { label: "Trains", value: String(engine.trains.length), color: "var(--ink-primary)" },
          {
            label: "Incidents",
            value: String(engine.activeIncidents.length),
            color: engine.activeIncidents.length > 0 ? "var(--crit)" : "var(--ok)",
          },
          {
            label: "On time",
            value: `${onTimePct}%`,
            color: "var(--ok)",
          },
          { label: "Avg delay", value: `${engine.avgDelay.toFixed(1)}m`, color: "var(--warn)" },
        ].map((s) => (
          <div key={s.label}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: "bold", color: s.color, fontVariantNumeric: "tabular-nums" }}>
              {s.value}
            </p>
            <p style={{ fontSize: "9px", fontWeight: 500, color: "var(--ink-muted)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>
      <div
        style={{ marginTop: "8px", paddingTop: "6px", display: "flex", gap: "12px", borderTop: "1px solid var(--border-subtle)" }}
      >
        {LEGEND.map((l) => (
          <span key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "var(--ink-muted)" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function MapFallback() {
  return (
    <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-muted)", animation: "rm-blink 1.4s ease-in-out infinite" }}>
        Loading network map
      </p>
    </div>
  );
}

function ControlRoom() {
  const engine = useSimulation();
  const [view, setView] = useState<ViewId>("map");
  const [speed, setSpeed] = useState(1);
  const [resolution, setResolution] = useState(engine.lastResolution);

  useEffect(() => {
    engine.onResolved = (info) => {
      setResolution(info);
      toast.success(`Incident Resolved — ${info.title}`, {
        description: `Resolved by AI in ${info.seconds}s · ${info.passengers.toLocaleString()} passengers notified`,
        duration: 4000,
      });
    };
    return () => {
      engine.onResolved = null;
    };
  }, [engine]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "d") engine.triggerDemo();
      else if (k === "1" || k === "2" || k === "5") {
        const s = Number(k);
        setSpeed(s);
        engine.setSpeed(s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  return (
    <main className="app-shell">
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--bg-panel)",
            border: "1px solid var(--ok-border)",
            color: "var(--ok)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          },
        }}
      />
      <ResolutionModal
        info={resolution}
        onClose={() => {
          setResolution(null);
          engine.clearLastResolution();
        }}
      />
      <ControlBar
        clock={engine.timeNow()}
        health={engine.health}
        connectionStatus={engine.connectionStatus}
        speed={speed}
        onSpeed={(s) => {
          setSpeed(s);
          engine.setSpeed(s);
        }}
        onDemo={() => engine.triggerDemo()}
        demoRunning={engine.demoRunning}
        view={view}
        onView={setView}
      />

      <div className="app-body">
        <div className="main-content relative">
          {view === "analytics" ? (
            <AnalyticsPanel engine={engine} />
          ) : view === "network" ? (
            <>
              <Suspense fallback={<MapFallback />}>
                <RailMap
                  trains={engine.trains}
                  segments={engine.segments}
                  incidents={engine.incidents}
                  networkView
                />
              </Suspense>
              <div className="rm-overlay-panel" style={{ position: "absolute", right: "12px", top: "12px", zIndex: 1000, padding: "10px 12px" }}>
                <p style={{ fontSize: "10px", fontWeight: 600, marginBottom: "8px", color: "var(--ink-muted)" }}>
                  Track health
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {TRACK_LEGEND.map((l) => (
                    <p key={l.label} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--ink-secondary)" }}>
                      <span
                        style={{ height: "3px", width: "20px", borderRadius: "2px", background: l.color }}
                      />
                      {l.label}
                    </p>
                  ))}
                </div>
                <p
                  style={{ marginTop: "8px", paddingTop: "6px", fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--ink-muted)", borderTop: "1px solid var(--border-subtle)" }}
                >
                  Bubbles = platform occupancy
                </p>
              </div>
              <MapStatsOverlay engine={engine} />
            </>
          ) : (
            <>
              <Suspense fallback={<MapFallback />}>
                <RailMap
                  trains={engine.trains}
                  segments={engine.segments}
                  incidents={engine.incidents}
                />
              </Suspense>
              <MapStatsOverlay engine={engine} />
            </>
          )}
        </div>

        {view === "map" && (
          <aside className="sidebar">
            <AgentPanel agents={engine.agents} />
            <IncidentFeed feed={engine.feed} incidents={engine.incidents} />
            <StatsBar
              trainsRunning={engine.trains.length}
              avgDelay={engine.avgDelay}
              resolutions={engine.resolvedCount}
              health={engine.health}
            />
          </aside>
        )}
      </div>
    </main>
  );
}
