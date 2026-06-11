import { Brain, Megaphone, Radar, Route as RouteIcon, Siren, Wrench } from "lucide-react";
import type { AgentId, AgentState, AgentStatus } from "@/lib/sim/types";

const ICONS: Record<AgentId, typeof Brain> = {
  orchestrator: Brain,
  monitor: Radar,
  incident_response: Siren,
  route_optimizer: RouteIcon,
  passenger_comms: Megaphone,
  maintenance: Wrench,
};

const ORDER: AgentId[] = [
  "orchestrator",
  "monitor",
  "incident_response",
  "route_optimizer",
  "passenger_comms",
  "maintenance",
];

const STATUS_STYLES: Record<AgentStatus, string> = {
  idle: "bg-muted text-muted-foreground",
  analyzing: "bg-warning/15 text-warning",
  acting: "bg-primary/15 text-primary",
  complete: "bg-success/15 text-success",
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "IDLE",
  analyzing: "ANALYZING",
  acting: "ACTING",
  complete: "COMPLETE",
};

interface AgentPanelProps {
  agents: Record<AgentId, AgentState>;
}

export function AgentPanel({ agents }: AgentPanelProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          AI Agents
        </h2>
        <span className="font-mono text-[10px] text-agent">6 autonomous</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {ORDER.map((id) => {
          const a = agents[id];
          const Icon = ICONS[id];
          const busy = a.status !== "idle";
          return (
            <article
              key={id}
              className={`rounded-lg border bg-card p-2.5 transition-colors ${
                busy ? "border-agent/40" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                    busy ? "bg-agent/15 text-agent" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="min-w-0 flex-1 truncate text-xs font-semibold">{a.name}</h3>
                <span
                  className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold ${STATUS_STYLES[a.status]}`}
                >
                  {busy && <span className="h-1 w-1 rounded-full bg-current rm-blink" />}
                  {STATUS_LABEL[a.status]}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {a.activity}
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-mono text-[9px] text-primary/80">
                  {a.lastAction ? `last: ${a.lastAction}()` : "no actions yet"}
                </span>
                <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                  {a.actionsToday} actions
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
