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
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="animate-pulse font-mono text-sm text-muted-foreground">
          Initializing RailMind control room…
        </p>
      </main>
    );
  }
  return <ControlRoom />;
}

const LEGEND = [
  { label: "On time", color: "bg-success" },
  { label: "Delayed", color: "bg-warning" },
  { label: "Critical", color: "bg-destructive" },
  { label: "Rerouting", color: "bg-agent" },
] as const;

const TRACK_LEGEND = [
  { label: "Clear", color: "#10B981" },
  { label: "Restricted / slow", color: "#F59E0B" },
  { label: "Blocked", color: "#EF4444" },
] as const;

function MapStatsOverlay({ engine }: { engine: SimEngine }) {
  const onTime = engine.trains.filter((t) => t.status === "on_time").length;
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-lg border border-border bg-card/85 px-3 py-2 backdrop-blur">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Trains", value: String(engine.trains.length) },
          {
            label: "Incidents",
            value: String(engine.activeIncidents.length),
            tone: engine.activeIncidents.length > 0 ? "text-destructive" : "text-success",
          },
          {
            label: "On time",
            value: `${Math.round((onTime / engine.trains.length) * 100)}%`,
            tone: "text-success",
          },
          { label: "Avg delay", value: `${engine.avgDelay.toFixed(1)}m`, tone: "text-warning" },
        ].map((s) => (
          <div key={s.label}>
            <p className={`font-mono text-sm font-bold ${s.tone ?? ""}`}>{s.value}</p>
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3 border-t border-border/60 pt-1.5">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 text-[10px]">
            <span className={`h-2 w-2 rounded-full ${l.color}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function MapFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="animate-pulse font-mono text-xs text-muted-foreground">
        Loading network map…
      </p>
    </div>
  );
}

function ControlRoom() {
  const engine = useSimulation();
  const [view, setView] = useState<ViewId>("map");
  const [speed, setSpeed] = useState(1);
  const [resolution, setResolution] = useState(engine.lastResolution);

  // Resolved-incident toast + modal.
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

  // Keyboard shortcuts: D = demo, 1/2/5 = speed.
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
    <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "rgba(16,185,129,0.12)",
            border: "1px solid #10B981",
            color: "var(--color-foreground)",
            backdropFilter: "blur(8px)",
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

      {view === "analytics" ? (
        <AnalyticsPanel engine={engine} />
      ) : view === "network" ? (
        <div className="relative min-h-0 flex-1">
          <Suspense fallback={<MapFallback />}>
            <RailMap
              trains={engine.trains}
              segments={engine.segments}
              incidents={engine.incidents}
              networkView
            />
          </Suspense>
          <div className="absolute right-3 top-3 z-[1000] rounded-lg border border-border bg-card/85 px-3 py-2.5 backdrop-blur">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Track health
            </p>
            <div className="mt-1.5 space-y-1">
              {TRACK_LEGEND.map((l) => (
                <p key={l.label} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="h-1 w-5 rounded-full"
                    style={{ background: l.color }}
                  />
                  {l.label}
                </p>
              ))}
            </div>
            <p className="mt-2 border-t border-border/60 pt-1.5 font-mono text-[9px] text-muted-foreground">
              Bubbles = platform occupancy
            </p>
          </div>
          <MapStatsOverlay engine={engine} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative h-[45vh] min-w-0 lg:h-auto lg:flex-1">
            <Suspense fallback={<MapFallback />}>
              <RailMap
                trains={engine.trains}
                segments={engine.segments}
                incidents={engine.incidents}
              />
            </Suspense>
            <MapStatsOverlay engine={engine} />
          </div>

          <aside className="flex min-h-0 flex-1 flex-col border-t border-border lg:w-[420px] lg:flex-none lg:border-l lg:border-t-0">
            <AgentPanel agents={engine.agents} />
            <IncidentFeed feed={engine.feed} incidents={engine.incidents} />
            <StatsBar
              trainsRunning={engine.trains.length}
              avgDelay={engine.avgDelay}
              resolutions={engine.resolvedCount}
              health={engine.health}
            />
          </aside>
        </div>
      )}
    </main>
  );
}
