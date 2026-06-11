import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CheckCircle2, Siren, Timer } from "lucide-react";
import type { SimEngine } from "@/lib/sim/engine";

/* Chart layers require literal color strings (SVG attributes can't resolve CSS vars). */
const C = {
  blue: "#3B82F6",
  green: "#10B981",
  purple: "#8B5CF6",
  grid: "#22304f",
  tick: "#94A3B8",
  tooltipBg: "#1A2236",
  tooltipBorder: "#2d3a5c",
};

const AGENT_SHORT: Record<string, string> = {
  orchestrator: "Orch",
  monitor: "Monitor",
  incident_response: "Incident",
  route_optimizer: "Route",
  passenger_comms: "Comms",
  maintenance: "Maint",
};

interface AnalyticsPanelProps {
  engine: SimEngine;
}

export function AnalyticsPanel({ engine }: AnalyticsPanelProps) {
  const agentData = Object.values(engine.agents).map((a) => ({
    name: AGENT_SHORT[a.id] ?? a.id,
    actions: a.actionsToday,
  }));

  const avgRes = engine.avgResolutionSec;

  const stats = [
    {
      icon: Activity,
      label: "Network Health",
      value: String(engine.health),
      tone:
        engine.health >= 85
          ? "text-success"
          : engine.health >= 60
            ? "text-warning"
            : "text-destructive",
    },
    {
      icon: Siren,
      label: "Active Incidents",
      value: String(engine.activeIncidents.length),
      tone: engine.activeIncidents.length > 0 ? "text-destructive" : "text-success",
    },
    {
      icon: CheckCircle2,
      label: "Resolved Today",
      value: String(engine.resolvedCount),
      tone: "text-primary",
    },
    {
      icon: Timer,
      label: "Avg Resolution",
      value: avgRes === null ? "—" : `${avgRes}s`,
      tone: "text-agent",
    },
  ];

  const tooltipStyle = {
    backgroundColor: C.tooltipBg,
    border: `1px solid ${C.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 11,
    fontFamily: "JetBrains Mono, monospace",
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{s.label}</span>
            </div>
            <p className={`mt-2 font-mono text-3xl font-bold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Average Network Delay (min)
          </h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engine.history}>
                <defs>
                  <linearGradient id="delayFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.blue} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: C.tick, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: C.grid }}
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fill: C.tick, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="avgDelay"
                  name="Avg delay"
                  stroke={C.blue}
                  strokeWidth={2}
                  fill="url(#delayFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Agent Actions Today
          </h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentData}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: C.tick, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: C.grid }}
                />
                <YAxis
                  tick={{ fill: C.tick, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(59,130,246,0.06)" }} />
                <Bar dataKey="actions" name="Actions" fill={C.purple} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Network Health Score
          </h3>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engine.history}>
                <defs>
                  <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.green} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: C.tick, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: C.grid }}
                  minTickGap={30}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: C.tick, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="health"
                  name="Health"
                  stroke={C.green}
                  strokeWidth={2}
                  fill="url(#healthFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
