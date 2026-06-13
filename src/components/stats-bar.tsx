import React from "react";

interface StatsBarProps {
  trainsRunning: number;
  avgDelay: number;
  resolutions: number;
  health: number;
}

interface StatCellProps {
  value: React.ReactNode;
  label: string;
  valueModifier?: "ok" | "warn" | "crit" | "blue";
}

function StatCell({ value, label, valueModifier }: StatCellProps) {
  return (
    <div className="stats-bar__cell">
      <span className={`stats-bar__val ${valueModifier ? `stats-bar__val--${valueModifier}` : ""}`}>
        {value}
      </span>
      <span className="stats-bar__lbl">
        {label}
      </span>
    </div>
  );
}

export function StatsBar({ trainsRunning, avgDelay, resolutions, health }: StatsBarProps) {
  const healthModifier = health >= 80 ? "ok" : health >= 50 ? "warn" : "crit";

  return (
    <div className="stats-bar">
      <StatCell
        value={trainsRunning}
        label="Trains running"
      />
      <StatCell
        value={
          <>
            {avgDelay.toFixed(1)}
            <span className="stats-bar__unit">m</span>
          </>
        }
        label="Avg delay"
        valueModifier="warn"
      />
      <StatCell
        value={resolutions}
        label="AI resolutions"
        valueModifier="ok"
      />
      <StatCell
        value={
          <>
            {health}
            <span className="stats-bar__unit">%</span>
          </>
        }
        label="Network health"
        valueModifier={healthModifier}
      />
    </div>
  );
}