import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Cpu,
  Eye,
  MessageSquare,
  Route as RouteIcon,
  Wrench,
} from "lucide-react";
import type { AgentId, AgentState } from "@/lib/sim/types";

/* Agent identity colors are domain data (mirrored on the map), not theme tokens. */
const AGENT_COLOR: Record<AgentId, string> = {
  monitor: "#06B6D4",
  orchestrator: "#3B82F6",
  incident_response: "#EF4444",
  route_optimizer: "#8B5CF6",
  passenger_comms: "#10B981",
  maintenance: "#F59E0B",
};

const ICONS: Record<AgentId, typeof Eye> = {
  monitor: Eye,
  orchestrator: Cpu,
  incident_response: AlertTriangle,
  route_optimizer: RouteIcon,
  passenger_comms: MessageSquare,
  maintenance: Wrench,
};

const ROLE: Record<AgentId, string> = {
  monitor: "Watching all 8 trains and 13 track segments",
  orchestrator: "Coordinating all agent responses",
  incident_response: "Classifying and resolving incidents",
  route_optimizer: "Computing optimal train paths",
  passenger_comms: "Notifying affected passengers",
  maintenance: "Scheduling repair windows",
};

const ACTIVE_LABEL: Record<AgentId, string> = {
  monitor: "SCANNING",
  orchestrator: "ROUTING",
  incident_response: "ANALYZING",
  route_optimizer: "COMPUTING",
  passenger_comms: "SENDING",
  maintenance: "SCHEDULING",
};

const ORDER: AgentId[] = [
  "monitor",
  "orchestrator",
  "incident_response",
  "route_optimizer",
  "passenger_comms",
  "maintenance",
];

/** Typewriter that re-types whenever the source text changes. */
function Typewriter({ text }: { text: string }) {
  const [len, setLen] = useState(text.length);
  const prev = useRef(text);

  useEffect(() => {
    if (prev.current === text) return;
    prev.current = text;
    setLen(0);
    const iv = setInterval(() => {
      setLen((l) => {
        if (l >= text.length) {
          clearInterval(iv);
          return l;
        }
        return l + 2;
      });
    }, 20);
    return () => clearInterval(iv);
  }, [text]);

  const done = len >= text.length;
  return (
    <>
      {text.slice(0, len)}
      {!done && <span className="rm-caret" />}
    </>
  );
}

function Sparkline({ seed, color }: { seed: number; color: string }) {
  const bars = Array.from({ length: 6 }, (_, i) => 25 + ((seed * 7 + i * 13) % 70));
  return (
    <span className="flex h-3.5 items-end gap-[2px]">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm transition-all duration-500"
          style={{ height: `${h}%`, background: color, opacity: 0.4 + (i / 6) * 0.6 }}
        />
      ))}
    </span>
  );
}

interface AgentPanelProps {
  agents: Record<AgentId, AgentState>;
}

export function AgentPanel({ agents }: AgentPanelProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            AI Agents
          </h2>
          <span className="h-1.5 w-1.5 rounded-full bg-agent rm-blink" />
        </div>
        <span className="font-mono text-[10px] text-agent">6 autonomous</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {ORDER.map((id) => {
          const a = agents[id];
          const Icon = ICONS[id];
          const color = AGENT_COLOR[id];
          const busy = a.status === "analyzing" || a.status === "acting";
          const complete = a.status === "complete";
          return (
            <article
              key={id}
              className="rounded-lg border bg-card p-2.5 transition-colors"
              style={{ borderColor: busy ? `${color}66` : "var(--color-border)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{
                    background: `${color}26`,
                    color,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xs font-semibold">{a.name}</h3>
                  <p className="truncate text-[9px] text-muted-foreground">{ROLE[id]}</p>
                </div>
                <motion.span
                  key={a.status}
                  initial={{ scale: 0.85, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold"
                  style={
                    complete
                      ? { background: "rgba(16,185,129,0.15)", color: "#10B981" }
                      : busy
                        ? {
                            background: `${color}26`,
                            color,
                            boxShadow: a.status === "acting" ? `0 0 12px ${color}55` : undefined,
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            color: "var(--color-muted-foreground)",
                          }
                  }
                >
                  {complete ? (
                    <Check className="h-2.5 w-2.5" />
                  ) : (
                    <span
                      className={`h-1 w-1 rounded-full bg-current ${busy ? "rm-blink" : ""}`}
                    />
                  )}
                  {complete ? "COMPLETE" : busy ? ACTIVE_LABEL[id] : "IDLE"}
                </motion.span>
              </div>

              <p className="mt-1.5 min-h-[28px] text-[11px] leading-snug text-muted-foreground">
                {busy ? <Typewriter text={a.activity} /> : a.activity}
              </p>

              <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-border/60 pt-1.5">
                <span className="font-mono text-[9px] text-muted-foreground">
                  ↗ {a.actionsToday} actions today
                </span>
                <span className="flex items-center gap-2">
                  {a.lastAction && (
                    <span className="max-w-[120px] truncate font-mono text-[9px] text-primary/70">
                      {a.lastAction}()
                    </span>
                  )}
                  <Sparkline seed={a.actionsToday + id.length} color={color} />
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
