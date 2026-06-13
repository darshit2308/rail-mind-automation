import { useEffect, useRef, useState } from "react";
import type { AgentId, AgentState } from "@/lib/sim/types";

const AGENT_NAME: Record<AgentId, string> = {
  monitor: "Network Monitor",
  orchestrator: "Orchestrator",
  incident_response: "Incident Response",
  route_optimizer: "Route Optimizer",
  passenger_comms: "Passenger Comms",
  maintenance: "Maintenance",
};

const ACTIVE_LABEL: Record<AgentId, string> = {
  monitor: "Scanning",
  orchestrator: "Routing",
  incident_response: "Analyzing",
  route_optimizer: "Computing",
  passenger_comms: "Sending",
  maintenance: "Scheduling",
};

const ORDER: AgentId[] = [
  "monitor",
  "orchestrator",
  "incident_response",
  "route_optimizer",
  "passenger_comms",
  "maintenance",
];

function Typewriter({ text }: { text: string }) {
  const [len, setLen] = useState(text.length);
  const prev = useRef(text);

  useEffect(() => {
    if (prev.current === text) return;
    prev.current = text;
    setLen(0);
    const iv = setInterval(() => {
      setLen((l) => {
        if (l >= text.length) { clearInterval(iv); return l; }
        return l + 2;
      });
    }, 18);
    return () => clearInterval(iv);
  }, [text]);

  return <>{text.slice(0, len)}</>;
}

function MiniSparkline({ seed }: { seed: number }) {
  const bars = Array.from({ length: 10 }, (_, i) => 15 + ((seed * 7 + i * 13) % 80));
  const max = Math.max(...bars);
  return (
    <span className="sparkline">
      {bars.map((h, i) => (
        <span
          key={i}
          className="sparkline__bar"
          style={{
            height: `${(h / max) * 100}%`,
            opacity: 0.2 + (i / bars.length) * 0.8,
          }}
        />
      ))}
    </span>
  );
}

interface AgentPanelProps {
  agents: Record<AgentId, AgentState>;
}

export function AgentPanel({ agents }: AgentPanelProps) {
  const activeCount = ORDER.filter((id) => {
    const s = agents[id].status;
    return s === "analyzing" || s === "acting";
  }).length;

  return (
    <section className="agent-panel">
      {/* Section header */}
      <div className="agent-panel__header">
        <div className="agent-panel__meta">
          <h2 className="agent-panel__title">AI Agents</h2>
          {activeCount > 0 && (
            <span className="agent-panel__active-badge">
              {activeCount} active
            </span>
          )}
        </div>
        <span className="agent-panel__count">
          6 agents
        </span>
      </div>

      <div className="agent-panel__list">
        {ORDER.map((id) => {
          const a = agents[id];
          const busy = a.status === "analyzing" || a.status === "acting";
          const complete = a.status === "complete";
          
          let statusClass = "idle";
          if (complete) statusClass = "complete";
          else if (busy) statusClass = "active";

          return (
            <article key={id} className={`agent-row agent-row--${statusClass}`}>
              <div className="agent-row__accent" />
              
              <div className="agent-row__body">
                <h3 className="agent-row__name">{AGENT_NAME[id]}</h3>
                <p className="agent-row__activity">
                  {busy ? <Typewriter text={a.activity} /> : a.activity}
                </p>
              </div>

              <div className="agent-row__right">
                <span className={`agent-row__badge agent-row__badge--${statusClass}`}>
                  {complete ? "Done" : busy ? ACTIVE_LABEL[id] : "Idle"}
                </span>

                <div className="agent-row__stats">
                  <span className="agent-row__acts">
                    {a.actionsToday} acts
                  </span>
                  <MiniSparkline seed={a.actionsToday + id.length} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}