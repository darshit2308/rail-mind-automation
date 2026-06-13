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

const C = {
  navy:   "var(--accent)",
  blue:   "var(--accent)",
  green:  "var(--ok)",
  amber:  "var(--warn)",
  red:    "var(--crit)",
  grid:   "var(--border-subtle)",
  tick:   "var(--ink-secondary)",
  tooltipBg:     "var(--bg-panel)",
  tooltipBorder: "var(--border-default)",
};

const AGENT_SHORT: Record<string, string> = {
  orchestrator:      "Orch",
  monitor:           "Monitor",
  incident_response: "Incident",
  route_optimizer:   "Route",
  passenger_comms:   "Comms",
  maintenance:       "Maint",
};

interface AnalyticsPanelProps {
  engine: SimEngine;
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: C.tooltipBg,
  border: `1px solid ${C.tooltipBorder}`,
  borderRadius: 8,
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  padding: "8px 12px",
  boxShadow: "var(--shadow-md)",
  color: "var(--ink-800)",
};

function ChartCard({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`chart-card ${wide ? "chart-card--wide" : ""}`}>
      <div className="chart-card__header">
        <h3 className="chart-card__title">
          {title}
        </h3>
        {subtitle && (
          <span className="chart-card__subtitle">
            {subtitle}
          </span>
        )}
      </div>
      <div className="chart-card__body">
        {children}
      </div>
    </div>
  );
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
      label: "Network health",
      value: String(engine.health),
      unit: "%",
      valueModifier: engine.health >= 85 ? "ok" : engine.health >= 60 ? "warn" : "crit",
    },
    {
      icon: Siren,
      label: "Active incidents",
      value: String(engine.activeIncidents.length),
      unit: "",
      valueModifier: engine.activeIncidents.length > 0 ? "crit" : "ok",
    },
    {
      icon: CheckCircle2,
      label: "Resolved today",
      value: String(engine.resolvedCount),
      unit: "",
      valueModifier: "rail",
    },
    {
      icon: Timer,
      label: "Avg resolution",
      value: avgRes === null ? "—" : String(avgRes),
      unit: avgRes === null ? "" : "s",
      valueModifier: "rail",
    },
  ] as const;

  return (
    <section className="analytics-panel">
      {/* Stat strip replaces KPI card grid */}
      <div className="analytics-stat-strip">
        {stats.map((s) => (
          <div key={s.label} className="analytics-stat">
            <s.icon className="analytics-stat__icon" />
            <span className={`analytics-stat__value analytics-stat__value--${s.valueModifier}`}>
              {s.value}
              {s.unit && <span className="analytics-stat__unit">{s.unit}</span>}
            </span>
            <span className="analytics-stat__label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="analytics-charts">
        {/* Delay trend */}
        <ChartCard title="Average network delay" subtitle="(minutes)">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engine.history} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 0" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: C.tick, fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={{ stroke: C.grid }}
                  minTickGap={36}
                />
                <YAxis
                  tick={{ fill: C.tick, fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={false}
                  width={34}
                  tickFormatter={(v: number) => v.toFixed(1)}
                  domain={[0, "auto"]}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: C.blue, strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey="avgDelay"
                  name="Avg delay"
                  stroke={C.blue}
                  strokeWidth={2}
                  fill="transparent"
                  dot={false}
                  activeDot={{ r: 4, fill: C.blue, stroke: "var(--surface)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Agent actions */}
        <ChartCard title="Agent actions today">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentData} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: C.tick, fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={{ stroke: C.grid }}
                />
                <YAxis
                  tick={{ fill: C.tick, fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={false}
                  width={34}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--surface-hover)" }}
                />
                <Bar
                  dataKey="actions"
                  name="Actions"
                  fill={C.navy}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={32}
                  opacity={0.9}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Health score — wide */}
        <ChartCard title="Network health score" subtitle="(0–100)" wide>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engine.history} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 0" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: C.tick, fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={{ stroke: C.grid }}
                  minTickGap={36}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: C.tick, fontSize: 10, fontFamily: "var(--font-mono)" }}
                  tickLine={false}
                  axisLine={false}
                  width={34}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: C.green, strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey="health"
                  name="Health"
                  stroke={C.green}
                  strokeWidth={2}
                  fill="transparent"
                  dot={false}
                  activeDot={{ r: 4, fill: C.green, stroke: "var(--surface)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </section>
  );
}