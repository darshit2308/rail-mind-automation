export type AgentId =
  | "orchestrator"
  | "monitor"
  | "incident_response"
  | "route_optimizer"
  | "passenger_comms"
  | "maintenance";

export type AgentStatus = "idle" | "analyzing" | "acting" | "complete";

export interface AgentState {
  id: AgentId;
  name: string;
  status: AgentStatus;
  activity: string;
  lastAction: string | null;
  actionsToday: number;
}

export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type SegmentStatus = "clear" | "restricted" | "closed";

export interface Segment {
  id: string;
  from: string;
  to: string;
  status: SegmentStatus;
}

export type TrainStatus = "on_time" | "delayed" | "halted" | "rerouted";

export interface Train {
  id: string;
  name: string;
  route: string[];
  leg: number;
  progress: number;
  speedKmh: number;
  status: TrainStatus;
  delayMinutes: number;
  passengers: number;
  capacity: number;
  lat: number;
  lng: number;
  heading: number;
  reroutedUntil: number;
}

export type IncidentType =
  | "signal_failure"
  | "track_obstruction"
  | "train_breakdown"
  | "platform_overcrowding"
  | "weather_restriction"
  | "medical_emergency"
  | "points_failure";

export type Severity = "medium" | "high" | "critical";

export interface Incident {
  id: string;
  type: IncidentType;
  label: string;
  severity: Severity;
  locationName: string;
  lat: number;
  lng: number;
  affectedTrains: string[];
  raisedAt: string;
  raisedAtSim: number;
  status: "detected" | "in_resolution" | "resolved";
  resolvedAtSim?: number;
}

export type FeedKind = "detected" | "dispatch" | "thinking" | "step" | "resolved";

export interface ResolvedInfo {
  title: string;
  seconds: number;
  passengers: number;
}

export interface FeedEntry {
  id: number;
  kind: FeedKind;
  agent: AgentId | null;
  time: string;
  text: string;
}

export interface HistoryPoint {
  time: string;
  avgDelay: number;
  health: number;
}
