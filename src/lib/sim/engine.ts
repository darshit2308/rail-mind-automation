import { SEGMENT_SEEDS, STATIONS, TRAIN_SEEDS } from "@/data/network";
import { io } from "socket.io-client";
import type {
  AgentId,
  AgentState,
  ConnectionStatus,
  FeedEntry,
  FeedKind,
  HistoryPoint,
  Incident,
  IncidentType,
  ResolvedInfo,
  Segment,
  SegmentStatus,
  Severity,
  Train,
  TrainStatus,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const DEG = Math.PI / 180;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = (bLat - aLat) * DEG;
  const dLng = (bLng - aLng) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * DEG) * Math.cos(bLat * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const AGENT_NAMES: Record<AgentId, string> = {
  orchestrator: "Master Orchestrator",
  monitor: "Network Monitor",
  incident_response: "Incident Response",
  route_optimizer: "Route Optimizer",
  passenger_comms: "Passenger Comms",
  maintenance: "Maintenance Scheduler",
};

const MONITOR_IDLE = "Scanning live telemetry across 12 stations and 18 track segments…";

interface IncidentDef {
  label: string;
  severity: Severity;
  detect: (loc: string) => string;
  cause: (loc: string) => string;
  maint: (loc: string) => string;
}

const INCIDENT_DEFS: Record<IncidentType, IncidentDef> = {
  signal_failure: {
    label: "Signal failure",
    severity: "high",
    detect: (l) =>
      `Telemetry anomaly: signal cluster near ${l} returning fault codes. Cross-checked against historical pattern — genuine failure confirmed.`,
    cause: (l) =>
      `Root cause: signal box power feed failure near ${l}. Services directly blocked; knock-on risk to downstream platforms.`,
    maint: (l) =>
      `Querying maintenance windows for the ${l} corridor — overnight 01:00–04:00 slot has zero scheduled passenger services.`,
  },
  points_failure: {
    label: "Points failure",
    severity: "high",
    detect: (l) =>
      `Points machine at ${l} unresponsive to switch command. Retried twice — flagging as genuine equipment fault.`,
    cause: (l) =>
      `Root cause: actuator jam in junction points at ${l}. Manual switching required until repair.`,
    maint: (l) =>
      `Booking points-fitter crew for ${l}. Earliest low-traffic window identified tonight.`,
  },
  train_breakdown: {
    label: "Train breakdown",
    severity: "high",
    detect: (l) =>
      `Service near ${l} reporting zero traction and emergency brake application. Confirmed breakdown — not a scheduled stop.`,
    cause: (l) =>
      `Root cause: traction converter fault on unit near ${l}. Rescue locomotive or tow required; line occupied.`,
    maint: (l) =>
      `Scheduling depot inspection for failed unit and clearance crew at ${l}.`,
  },
  platform_overcrowding: {
    label: "Platform overcrowding",
    severity: "medium",
    detect: (l) =>
      `Crowd density sensors at ${l} exceeding 90% of safe threshold. Trend rising — raising incident.`,
    cause: (l) =>
      `Root cause: bunched arrivals at ${l} after an upstream delay. Holding the next inbound service to let platforms clear.`,
    maint: (l) =>
      `Logging a review of passenger-flow barriers and platform staffing at ${l}.`,
  },
  weather_restriction: {
    label: "Weather speed restriction",
    severity: "medium",
    detect: (l) =>
      `Heavy rainfall cell over the ${l} corridor. Adhesion risk rising — raising precautionary incident.`,
    cause: (l) =>
      `Root cause: reduced rail adhesion near ${l}. Imposing temporary speed cap on the affected corridor.`,
    maint: (l) =>
      `Scheduling drainage and trackbed inspection at ${l} once the weather cell passes.`,
  },
  medical_emergency: {
    label: "Medical emergency",
    severity: "high",
    detect: (l) =>
      `Onboard emergency alarm triggered aboard service near ${l}. Crew confirms passenger medical emergency.`,
    cause: (l) =>
      `Root cause: passenger medical emergency near ${l}. Paramedics requested to the nearest platform; controlled stop executed.`,
    maint: (l) =>
      `Logging incident for first-aid readiness review at ${l} station.`,
  },
  track_obstruction: {
    label: "Track obstruction",
    severity: "critical",
    detect: (l) =>
      `Track circuit near ${l} showing occupied with no scheduled movement. Probable obstruction on running line.`,
    cause: (l) =>
      `Root cause: debris on the running line near ${l}. Line closed; all approaching services halted as a safety measure.`,
    maint: (l) =>
      `Dispatching emergency clearance crew to ${l} with priority track possession.`,
  },
};

const INCIDENT_TYPE_ALIASES: Record<string, IncidentType> = {
  weather_speed_restriction: "weather_restriction",
};

function mapIncidentType(type: string): IncidentType {
  return INCIDENT_TYPE_ALIASES[type] ?? (type as IncidentType);
}

function mapTrainStatus(status: string, delayMinutes: number): TrainStatus {
  if (status === "halted" || status === "stopped_at_station") return "halted";
  if (status === "delayed" || delayMinutes > 5) return "delayed";
  if (status === "rerouted") return "rerouted";
  return "on_time";
}

function mapSegmentHealth(health: string): SegmentStatus {
  if (health === "restricted") return "restricted";
  if (health === "closed") return "closed";
  return "clear";
}

export class SimEngine {
  trains: Train[];
  segments: Segment[];
  incidents: Incident[] = [];
  agents: Record<AgentId, AgentState>;
  feed: FeedEntry[] = [];
  history: HistoryPoint[] = [];
  speed = 1;
  wallSim = 0;
  resolvedCount = 0;
  resolutionTimes: number[] = [];
  demoRunning = false;
  connectionStatus: ConnectionStatus = "connecting";
  lastResolution: ResolvedInfo | null = null;
  /** Set by the UI layer to fire a toast when an incident resolves. */
  onResolved: ((info: ResolvedInfo) => void) | null = null;

  private socket: any;
  private scheduled: { due: number; fn: () => void }[] = [];
  private feedSeq = 0;
  private incSeq = 0;
  private lastSample = 0;
  private clockBase = Date.now();
  private stationMap = new Map(STATIONS.map((s) => [s.id, s] as const));

  constructor() {
    this.segments = SEGMENT_SEEDS.map((s) => ({ ...s, status: "clear" as const }));
    this.trains = TRAIN_SEEDS.map((seed) => {
      const t: Train = {
        ...seed,
        route: [...seed.route],
        status: "on_time",
        delayMinutes: 0,
        lat: 0,
        lng: 0,
        heading: 0,
        reroutedUntil: 0,
      };
      this.placeTrain(t);
      return t;
    });

    const mk = (id: AgentId): AgentState => ({
      id,
      name: AGENT_NAMES[id],
      status: id === "monitor" ? "analyzing" : "idle",
      activity: id === "monitor" ? MONITOR_IDLE : "Standing by",
      lastAction: null,
      actionsToday: 0,
    });
    this.agents = {
      orchestrator: mk("orchestrator"),
      monitor: mk("monitor"),
      incident_response: mk("incident_response"),
      route_optimizer: mk("route_optimizer"),
      passenger_comms: mk("passenger_comms"),
      maintenance: mk("maintenance"),
    };

    // Seed analytics history so charts have context on load.
    for (let i = 10; i > 0; i--) {
      this.history.push({
        time: new Date(this.clockBase - i * 6000).toTimeString().slice(3, 8),
        avgDelay: 0,
        health: 100,
      });
    }

    this.pushFeed("step", null, "Connecting to RailMind backend...");
    void this.hydrateFromBackend();

    // Connect to Socket.IO backend with auto-reconnect
    this.socket = io(API_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });

    this.socket.on("connect", () => {
      this.connectionStatus = "connected";
      console.log("Connected to backend simulation server");
      this.pushFeed("step", null, "Connected to backend simulation server.");
      void this.hydrateFromBackend();
    });

    this.socket.on("disconnect", () => {
      this.connectionStatus = "disconnected";
      console.log("Disconnected from backend simulation server");
      this.pushFeed("step", null, "Connection lost. Reconnecting...");
    });

    this.socket.io.on("reconnect_attempt", () => {
      this.connectionStatus = "connecting";
    });

    this.socket.on("train:update", (data: { trains: any[] }) => {
      this.applyTrainUpdate(data.trains);
    });

    this.socket.on("incident:new", (data: { incident: any }) => {
      const inc = data.incident;
      const incidentType = mapIncidentType(inc.type);
      const frontendInc: Incident = {
        id: inc.id,
        type: incidentType,
        label: INCIDENT_DEFS[incidentType]?.label ?? inc.type,
        severity: inc.severity,
        locationName: inc.location.name,
        lat: inc.location.lat,
        lng: inc.location.lng,
        affectedTrains: inc.affected_trains,
        raisedAt: inc.raised_at,
        raisedAtSim: this.wallSim,
        status: inc.status,
      };
      this.incidents.unshift(frontendInc);
      if (this.incidents.length > 14) this.incidents.pop();

      // Trigger monitor thinking log
      const def = INCIDENT_DEFS[incidentType];
      if (def) {
        this.think("monitor", def.detect(inc.location.name));
      }
    });

    this.socket.on("incident:update", (data: { incident: any }) => {
      const inc = data.incident;
      const existing = this.incidents.find((i) => i.id === inc.id);
      if (existing) {
        existing.status = inc.status;
      }
    });

    this.socket.on("agent:thinking", (data: { agent: AgentId; content: string }) => {
      this.think(data.agent, data.content);
    });

    this.socket.on("agent:action", (data: { agent: AgentId; action: string; params: any }) => {
      this.act(data.agent, data.action, data.action + "() executed.");
    });

    this.socket.on("agent:complete", (data: { agent: AgentId; summary: string }) => {
      const ag = this.agents[data.agent];
      if (ag) {
        ag.status = "complete";
        ag.activity = data.summary;
      }
    });

    this.socket.on("network:alert", (data: { segment_id: string; health: string }) => {
      const seg = this.segments.find((s) => s.id === data.segment_id);
      if (seg) {
        seg.status = mapSegmentHealth(data.health);
      }
    });

    this.socket.on(
      "resolution:complete",
      (data: {
        incident_id: string;
        summary: string;
        resolution_seconds?: number;
        passengers_affected?: number;
        resolution_log?: { timestamp: string; agent: string; action: string }[];
      }) => {
      const inc = this.incidents.find((i) => i.id === data.incident_id);
      if (inc) {
        inc.status = "resolved";
        inc.resolvedAtSim = this.wallSim;
        const seconds = data.resolution_seconds ?? Math.max(1, Math.round(this.wallSim - inc.raisedAtSim));
        this.resolutionTimes.push(seconds);
      }
      this.resolvedCount += 1;
      this.demoRunning = false;
      this.pushFeed("resolved", "orchestrator", data.summary);

      const passengers =
        data.passengers_affected ??
        (inc?.affectedTrains.reduce((sum, tid) => {
          const train = this.trains.find((t) => t.id === tid);
          return sum + (train?.passengers ?? 0);
        }, 0) || 1200);

      const resolvedInfo: ResolvedInfo = {
        title: inc?.label ?? "Incident Cleared",
        seconds: data.resolution_seconds ?? 25,
        passengers,
        incidentId: data.incident_id,
        summary: data.summary,
        timeline: data.resolution_log ?? [],
      };
      this.lastResolution = resolvedInfo;
      this.onResolved?.(resolvedInfo);

      // Set agents back to standby
      setTimeout(() => {
        const ids: AgentId[] = [
          "orchestrator",
          "incident_response",
          "route_optimizer",
          "passenger_comms",
          "maintenance",
        ];
        for (const aid of ids) {
          this.agents[aid].status = "idle";
          this.agents[aid].activity = "Standing by";
        }
        this.agents.monitor.status = "analyzing";
        this.agents.monitor.activity = MONITOR_IDLE;
      }, 5000);
    });
  }

  // ---------- public getters ----------

  get activeIncidents() {
    return this.incidents.filter((i) => i.status !== "resolved");
  }

  get avgDelay() {
    return this.trains.reduce((s, t) => s + t.delayMinutes, 0) / this.trains.length;
  }

  get health() {
    const v = Math.round(100 - this.activeIncidents.length * 14 - this.avgDelay * 1.6);
    return Math.max(20, Math.min(100, v));
  }

  get avgResolutionSec(): number | null {
    if (this.resolutionTimes.length === 0) return null;
    return Math.round(
      this.resolutionTimes.reduce((a, b) => a + b, 0) / this.resolutionTimes.length,
    );
  }

  timeNow() {
    return new Date(this.clockBase + this.wallSim * 1000).toTimeString().slice(0, 8);
  }


  // ---------- simulation tick ----------

  tick(dtReal: number) {
    const dt = dtReal * this.speed;
    this.wallSim += dt;

    const due = this.scheduled.filter((e) => e.due <= this.wallSim);
    this.scheduled = this.scheduled.filter((e) => e.due > this.wallSim);
    for (const e of due) e.fn();

    // The backend handles simulation state, but we can sample analytics locally
    if (this.wallSim - this.lastSample >= 6) {
      this.lastSample = this.wallSim;
      this.history.push({
        time: this.timeNow().slice(3, 8),
        avgDelay: Math.round(this.avgDelay * 10) / 10,
        health: this.health,
      });
      if (this.history.length > 80) this.history.shift();
    }
  }

  // ---------- incidents ----------

  triggerDemo() {
    if (this.demoRunning) return;
    this.demoRunning = true;

    fetch(`${API_URL}/api/incidents/trigger`, {
      method: "POST",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Demo trigger failed");
        return res.json();
      })
      .then((data) => {
        console.log("Demo incident triggered successfully on backend:", data);
        // demoRunning resets on resolution:complete
      })
      .catch((err) => {
        console.error("Error triggering backend demo:", err);
        this.demoRunning = false;
      });
  }

  setSpeed(s: number) {
    this.speed = s;
    fetch(`${API_URL}/api/simulation/speed?speed=${s}`, {
      method: "POST",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Speed set failed");
        return res.json();
      })
      .then((data) => {
        console.log("Simulation speed updated on backend to:", s);
      })
      .catch((err) => {
        console.error("Error updating simulation speed:", err);
      });
  }

  clearLastResolution() {
    this.lastResolution = null;
  }

  // ---------- internals ----------

  private async hydrateFromBackend() {
    try {
      const [stateRes, topoRes] = await Promise.all([
        fetch(`${API_URL}/api/network/state`),
        fetch(`${API_URL}/api/network/topology`),
      ]);
      if (!stateRes.ok || !topoRes.ok) return;

      const stateData = await stateRes.json();
      const topoData = await topoRes.json();

      if (topoData.segments?.length) {
        this.segments = topoData.segments.map(
          (s: { id: string; from_station: string; to_station: string; health: string }) => ({
            id: s.id,
            from: s.from_station,
            to: s.to_station,
            status: mapSegmentHealth(s.health),
          }),
        );
      }

      if (stateData.tracks?.length) {
        for (const track of stateData.tracks) {
          const seg = this.segments.find((s) => s.id === track.id);
          if (seg) seg.status = mapSegmentHealth(track.health);
        }
      }

      if (stateData.trains?.length) {
        this.applyTrainUpdate(stateData.trains);
      }
    } catch (err) {
      console.warn("Backend hydration skipped:", err);
    }
  }

  private applyTrainUpdate(rawTrains: any[]) {
    this.trains = rawTrains.map((t) => {
      const prev = this.trains.find((p) => p.id === t.id);
      const seed = TRAIN_SEEDS.find((s) => s.id === t.id);
      return {
        id: t.id,
        name: t.name,
        route: t.route,
        leg: Math.max(0, t.route_index - 1),
        progress: t.progress_on_segment,
        speedKmh: t.speed_kmh,
        status: mapTrainStatus(t.status, t.delay_minutes),
        delayMinutes: t.delay_minutes,
        passengers: prev?.passengers ?? seed?.passengers ?? Math.floor(200 + Math.random() * 800),
        capacity: prev?.capacity ?? seed?.capacity ?? 1000,
        lat: t.position.lat,
        lng: t.position.lng,
        heading: prev?.heading ?? 0,
        reroutedUntil: 0,
      };
    });
    for (const t of this.trains) {
      this.placeTrain(t);
    }
  }

  private placeTrain(t: Train) {
    const a = this.stationMap.get(t.route[t.leg])!;
    const b = this.stationMap.get(t.route[t.leg + 1])!;
    if (!a || !b) return;
    t.lat = lerp(a.lat, b.lat, t.progress);
    t.lng = lerp(a.lng, b.lng, t.progress);
    t.heading = (Math.atan2(b.lng - a.lng, b.lat - a.lat) / DEG + 360) % 360;
  }

  private pushFeed(kind: FeedKind, agent: AgentId | null, text: string) {
    this.feed.unshift({ id: ++this.feedSeq, kind, agent, time: this.timeNow(), text });
    if (this.feed.length > 80) this.feed.pop();
  }

  private think(id: AgentId, text: string, kind: FeedKind = "thinking") {
    const ag = this.agents[id];
    if (ag) {
      ag.status = "analyzing";
      ag.activity = text;
    }
    this.pushFeed(kind, id, text);
  }

  private act(id: AgentId, action: string, text: string, kind: FeedKind = "step") {
    const ag = this.agents[id];
    if (ag) {
      ag.status = "acting";
      ag.activity = text;
      ag.lastAction = action;
      ag.actionsToday += 1;
    }
    this.pushFeed(kind, id, text);
  }
}
