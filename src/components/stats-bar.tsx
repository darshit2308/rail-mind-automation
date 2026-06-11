interface StatsBarProps {
  trainsRunning: number;
  avgDelay: number;
  resolutions: number;
  health: number;
}

function ScoreArc({ score }: { score: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <span className="relative inline-flex h-11 w-11 items-center justify-center">
      <svg viewBox="0 0 38 38" className="h-11 w-11 -rotate-90">
        <circle
          cx="19"
          cy="19"
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="3.5"
        />
        <circle
          cx="19"
          cy="19"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${(c * score) / 100} ${c}`}
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.6s ease" }}
        />
      </svg>
      <span
        className="absolute font-mono text-[10px] font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </span>
  );
}

export function StatsBar({ trainsRunning, avgDelay, resolutions, health }: StatsBarProps) {
  return (
    <div className="grid h-[90px] shrink-0 grid-cols-4 divide-x divide-border border-t border-border bg-card/40">
      <div className="flex flex-col items-center justify-center gap-0.5">
        <span className="font-mono text-2xl font-bold">{trainsRunning}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          Trains active
        </span>
      </div>
      <div className="flex flex-col items-center justify-center gap-0.5">
        <span className="font-mono text-2xl font-bold text-warning">
          {avgDelay.toFixed(1)}
          <span className="text-xs font-medium text-muted-foreground"> min</span>
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          Avg delay
        </span>
      </div>
      <div className="flex flex-col items-center justify-center gap-0.5">
        <span className="font-mono text-2xl font-bold text-success">{resolutions}</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          AI resolutions
        </span>
      </div>
      <div className="flex flex-col items-center justify-center gap-0.5">
        <ScoreArc score={health} />
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          Network score
        </span>
      </div>
    </div>
  );
}
