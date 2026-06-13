import { CheckCircle2, Clock, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ResolvedInfo } from "@/lib/sim/types";

const AGENT_COLORS: Record<string, { bg: string; text: string }> = {
  orchestrator:      { bg: "var(--accent-dim)", text: "var(--accent)" },
  monitor:           { bg: "var(--accent-dim)", text: "var(--accent)" },
  incident_response: { bg: "var(--crit-dim)", text: "var(--crit)" },
  route_optimizer:   { bg: "var(--warn-dim)", text: "var(--warn)" },
  passenger_comms:   { bg: "var(--ok-dim)", text: "var(--ok)" },
  maintenance:       { bg: "var(--warn-dim)", text: "var(--warn)" },
};

function agentColor(agent: string) {
  return AGENT_COLORS[agent] ?? { bg: "var(--border-default)", text: "var(--ink-secondary)" };
}

interface ResolutionModalProps {
  info: ResolvedInfo | null;
  onClose: () => void;
}

export function ResolutionModal({ info, onClose }: ResolutionModalProps) {
  return (
    <Dialog open={info !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="resolution-modal-content">
        <div className="resolution-modal__inner">
          <DialogHeader className="resolution-modal__header">
            <DialogTitle className="resolution-modal__title-block">
              <span className="resolution-modal__icon">
                <CheckCircle2 size={16} />
              </span>
              <span className="resolution-modal__title">Incident resolved</span>
            </DialogTitle>
            <DialogDescription className="resolution-modal__desc">
              <span className="resolution-modal__desc-id">{info?.incidentId}</span>
              <span className="resolution-modal__desc-sep">·</span>
              <span className="resolution-modal__desc-stat">
                <Clock size={12} />
                resolved in {info?.seconds}s
              </span>
              <span className="resolution-modal__desc-sep">·</span>
              <span className="resolution-modal__desc-ok">
                {info?.passengers.toLocaleString()} passengers notified
              </span>
            </DialogDescription>
          </DialogHeader>

          {info && (
            <div className="resolution-modal__body">
              {/* Summary card */}
              <div className="resolution-summary">
                <p className="resolution-summary__title">{info.title}</p>
                <p className="resolution-summary__text">{info.summary}</p>
              </div>

              {/* Timeline */}
              <div>
                <p className="modal-section-label">Resolution timeline</p>

                {/* Table */}
                <div className="timeline-table">
                  {/* Header */}
                  <div className="timeline-table__row timeline-table__row--header">
                    {["Time", "Agent", "Action"].map((h) => (
                      <span key={h} className="timeline-table__header-cell">
                        {h}
                      </span>
                    ))}
                  </div>

                  {(info.timeline.length > 0
                    ? info.timeline
                    : [{ timestamp: "—", agent: "orchestrator", action: info.summary }]
                  ).map((entry, i) => {
                    const ac = agentColor(entry.agent);
                    return (
                      <div
                        key={`${entry.timestamp}-${i}`}
                        className="timeline-table__row timeline-table__row--data"
                      >
                        <span className="timeline-table__time">{entry.timestamp}</span>
                        <span>
                          <span
                            className="timeline-table__agent-badge"
                            style={{ background: ac.bg, color: ac.text }}
                          >
                            <User className="timeline-table__agent-icon" />
                            {entry.agent.replace(/_/g, " ")}
                          </span>
                        </span>
                        <span className="timeline-table__action">{entry.action}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}