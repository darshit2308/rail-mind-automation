import type { FeedEntry, FeedKind, Incident } from "@/lib/sim/types";

const KIND_LABEL: Record<FeedKind, string> = {
  detected: "Detected",
  dispatch: "Dispatched",
  thinking: "Thinking",
  step: "Action",
  resolved: "Resolved",
};

const SEV_LABEL: Record<Incident["severity"], string> = {
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

interface IncidentFeedProps {
  feed: FeedEntry[];
  incidents: Incident[];
}

export function IncidentFeed({ feed, incidents }: IncidentFeedProps) {
  const active = incidents.filter((i) => i.status !== "resolved");

  return (
    <section className="incident-feed">
      {/* Header */}
      <div className="incident-feed__header">
        <h2 className="incident-feed__title">Incident Feed</h2>
        <span
          className={`incident-feed__badge ${
            active.length > 0 ? "incident-feed__badge--active" : "incident-feed__badge--clear"
          }`}
        >
          {active.length > 0 ? `${active.length} active` : "All clear"}
        </span>
      </div>

      {/* Active incident chips */}
      {active.length > 0 && (
        <div className="active-incidents">
          {active.map((i) => (
            <div key={i.id} className={`incident-chip incident-chip--${i.severity}`}>
              <span className="incident-chip__dot" />
              <span className="incident-chip__sev">{SEV_LABEL[i.severity]}</span>
              <span className="incident-chip__label">
                {i.label}
                <span className="incident-chip__location"> · {i.locationName}</span>
              </span>
              <span className="incident-chip__id">{i.id}</span>
            </div>
          ))}
        </div>
      )}

      {/* Feed log */}
      <ol className="feed-log">
        {feed.slice(0, 50).map((e) => (
          <li key={e.id} className={`feed-entry feed-entry--${e.kind}`}>
            <div className="feed-entry__timeline">
              <div className="feed-entry__dot" />
            </div>
            
            <div className="feed-entry__content">
              <div className="feed-entry__top">
                <span className="feed-entry__kind">
                  {KIND_LABEL[e.kind]}
                </span>
                {e.agent && (
                  <span className="feed-entry__agent">
                    {e.agent.replace(/_/g, " ")}
                  </span>
                )}
                <span className="feed-entry__time">{e.time}</span>
              </div>
              <p className="feed-entry__text">{e.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}