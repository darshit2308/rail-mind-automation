import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { AgentPanel } from "@/components/agent-panel";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { ControlBar } from "@/components/control-bar";
import { IncidentFeed } from "@/components/incident-feed";
import { useSimulation } from "@/hooks/use-simulation";

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
  { label: "Halted", color: "bg-destructive" },
  { label: "Rerouted", color: "bg-agent" },
] as const;

function ControlRoom() {
  const engine = useSimulation();
  const [view, setView] = useState<"ops" | "analytics">("ops");
  const [speed, setSpeed] = useState(1);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <ControlBar
        clock={engine.timeNow()}
        health={engine.health}
        activeIncidents={engine.activeIncidents.length}
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

      {view === "ops" ? (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative h-[45vh] min-w-0 lg:h-auto lg:flex-1">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <p className="animate-pulse font-mono text-xs text-muted-foreground">
                    Loading network map…
                  </p>
                </div>
              }
            >
              <RailMap
                trains={engine.trains}
                segments={engine.segments}
                incidents={engine.incidents}
              />
            </Suspense>

            <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-lg border border-border bg-card/85 px-3 py-2 backdrop-blur">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Train status
              </p>
              <div className="mt-1.5 flex gap-3">
                {LEGEND.map((l) => (
                  <span key={l.label} className="flex items-center gap-1.5 text-[10px]">
                    <span className={`h-2 w-2 rounded-full ${l.color}`} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="flex min-h-0 flex-1 flex-col border-t border-border lg:w-[430px] lg:flex-none lg:border-l lg:border-t-0">
            <AgentPanel agents={engine.agents} />
            <IncidentFeed feed={engine.feed} incidents={engine.incidents} />
          </aside>
        </div>
      ) : (
        <AnalyticsPanel engine={engine} />
      )}
    </main>
  );
}
