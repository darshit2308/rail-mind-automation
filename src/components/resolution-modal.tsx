import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ResolvedInfo } from "@/lib/sim/types";

interface ResolutionModalProps {
  info: ResolvedInfo | null;
  onClose: () => void;
}

export function ResolutionModal({ info, onClose }: ResolutionModalProps) {
  return (
    <Dialog open={info !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-success/30 bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-success">
            <CheckCircle2 className="h-5 w-5" />
            Incident Resolved
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            {info?.incidentId} · resolved in {info?.seconds}s ·{" "}
            {info?.passengers.toLocaleString()} passengers notified
          </DialogDescription>
        </DialogHeader>

        {info && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <p className="font-mono text-sm font-semibold">{info.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{info.summary}</p>
            </div>

            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Resolution Timeline
              </p>
              <ol className="mt-2 space-y-2">
                {(info.timeline.length > 0
                  ? info.timeline
                  : [{ timestamp: "—", agent: "orchestrator", action: info.summary }]
                ).map((entry, i) => (
                  <li
                    key={`${entry.timestamp}-${i}`}
                    className="flex gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2"
                  >
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {entry.timestamp}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-agent">
                        {entry.agent.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-foreground">{entry.action}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
