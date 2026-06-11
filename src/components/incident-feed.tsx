import { motion } from "framer-motion";
import type { FeedEntry, FeedKind, Incident } from "@/lib/sim/types";

const KIND_STYLES: Record<FeedKind, { border: string; label: string; text: string }> = {
  detected: { border: "border-l-destructive", label: "DETECTED", text: "text-destructive" },
  dispatch: { border: "border-l-primary", label: "DISPATCHED", text: "text-primary" },
  thinking: { border: "border-l-agent", label: "THINKING", text: "text-agent" },
  step: { border: "border-l-warning", label: "ACTION", text: "text-warning" },
  resolved: { border: "border-l-success", label: "RESOLVED", text: "text-success" },
};

const SEV_STYLES: Record<Incident["severity"], string> = {
  medium: "bg-warning/15 text-warning",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

interface IncidentFeedProps {
  feed: FeedEntry[];
  incidents: Incident[];
}

export function IncidentFeed({ feed, incidents }: IncidentFeedProps) {
  const active = incidents.filter((i) => i.status !== "resolved");

  return (
    <section className="flex min-h-0 flex-1 flex-col border-t border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Incident Feed
          </h2>
          <span className="flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-destructive">
            <span className="h-1 w-1 rounded-full bg-destructive rm-blink" />
            LIVE
          </span>
        </div>
        <span
          className={`font-mono text-[10px] ${active.length > 0 ? "text-destructive" : "text-success"}`}
        >
          {active.length > 0 ? `${active.length} active` : "all clear"}
        </span>
      </div>

      {active.length > 0 && (
        <div className="space-y-1.5 border-b border-border p-2.5">
          {active.map((i) => (
            <div
              key={i.id}
              className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5"
            >
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${SEV_STYLES[i.severity]}`}
              >
                {i.severity.toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px]">
                {i.label} · {i.locationName}
              </span>
              <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{i.id}</span>
            </div>
          ))}
        </div>
      )}

      <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
        {feed.slice(0, 50).map((e) => {
          const k = KIND_STYLES[e.kind];
          return (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`rounded-r-md border-l-2 bg-card/60 px-2.5 py-1.5 ${k.border}`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[9px] font-bold ${k.text}`}>{k.label}</span>
                {e.agent && (
                  <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                    {e.agent.replace("_", " ")}
                  </span>
                )}
                <span className="ml-auto font-mono text-[9px] text-muted-foreground">{e.time}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-foreground/90">{e.text}</p>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
