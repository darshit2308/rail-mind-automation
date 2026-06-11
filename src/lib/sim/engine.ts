import { SEGMENT_SEEDS, STATIONS, TRAIN_SEEDS } from "@/data/network";
import { io } from "socket.io-client";
import type {
  AgentId,
  AgentState,
  FeedEntry,
  FeedKind,
  HistoryPoint,
  Incident,
  IncidentType,
  ResolvedInfo,
  Segment,
  Severity,
  Train,
} from "./types";

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

const RANDOM_POOL: IncidentType[] = [
  "signal_failure",
  "points_failure",
  "train_breakdown",
  "platform_overcrowding",
  "weather_restriction",
  "medical_emergency",
  "signal_failure",
  "platform_overcrowding",
];

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

    // Connect to Socket.IO backend
    this.socket = io("http://localhost:8000");

    this.socket.on("connect", () => {
      console.log("Connected to backend simulation server");
      this.pushFeed("step", null, "Connected to backend simulation server.");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from backend simulation server");
      this.pushFeed("step", null, "Connection lost. Reconnecting...");
    });

    this.socket.on("train:update", (data: { trains: any[] }) => {
      this.trains = data.trains.map((t) => {
        const prev = this.trains.find((p) => p.id === t.id);
        return {
          id: t.id,
          name: t.name,
          route: t.route,
          leg: Math.max(0, t.route_index - 1),
          progress: t.progress_on_segment,
          speedKmh: t.speed_kmh,
          status: t.status === "running" ? "on_time" : t.status,
          delayMinutes: t.delay_minutes,
          passengers: prev?.passengers ?? Math.floor(200 + Math.random() * 800),
          capacity: prev?.capacity ?? 1000,
          lat: t.position.lat,
          lng: t.position.lng,
          heading: prev?.heading ?? 0,
          reroutedUntil: 0,
        };
      });
      // Set heading correctly based on route index positions
      for (const t of this.trains) {
        this.placeTrain(t);
      }
    });

    this.socket.on("incident:new", (data: { incident: any }) => {
      const inc = data.incident;
      const frontendInc: Incident = {
        id: inc.id,
        type: inc.type,
        label: INCIDENT_DEFS[inc.type as IncidentType]?.label ?? inc.type,
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
      const def = INCIDENT_DEFS[inc.type as IncidentType];
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

    this.socket.on("network:alert", (data: { segment_id: string; health: any }) => {
      const seg = this.segments.find((s) => s.id === data.segment_id);
      if (seg) {
        seg.status = data.health;
      }
    });

    this.socket.on("resolution:complete", (data: { incident_id: string; summary: string }) => {
      const inc = this.incidents.find((i) => i.id === data.incident_id);
      if (inc) {
        inc.status = "resolved";
        inc.resolvedAtSim = this.wallSim;
      }
      this.resolvedCount += 1;
      this.pushFeed("resolved", "orchestrator", data.summary);

      this.onResolved?.({
        title: inc?.label ?? "Incident Cleared",
        seconds: 25,
        passengers: 1200,
      });

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

    fetch("http://localhost:8000/api/incidents/trigger", {
      method: "POST",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Demo trigger failed");
        return res.json();
      })
      .then((data) => {
        console.log("Demo incident triggered successfully on backend:", data);
      })
      .catch((err) => {
        console.error("Error triggering backend demo:", err);
        this.demoRunning = false;
      });
  }

  setSpeed(s: number) {
    this.speed = s;
    fetch(`http://localhost:8000/api/simulation/speed?speed=${s}`, {
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

  // ---------- internals ----------

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
