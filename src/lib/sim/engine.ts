import { SEGMENT_SEEDS, STATIONS, TRAIN_SEEDS } from "@/data/network";
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

const MONITOR_IDLE = "Scanning live telemetry across 12 stations and 13 track segments…";

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
        delayMinutes: Math.floor(Math.random() * 7),
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
        avgDelay: Math.round((4 + Math.random() * 4) * 10) / 10,
        health: 88 + Math.floor(Math.random() * 8),
      });
    }

    this.pushFeed("step", null, "RailMind online — 6 agents initialized, network nominal.");
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

  setSpeed(s: number) {
    this.speed = s;
  }

  // ---------- simulation tick ----------

  tick(dtReal: number) {
    const dt = dtReal * this.speed;
    this.wallSim += dt;

    const due = this.scheduled.filter((e) => e.due <= this.wallSim);
    this.scheduled = this.scheduled.filter((e) => e.due > this.wallSim);
    for (const e of due) e.fn();

    const hours = (dt * 110) / 3600; // time compression: 1 real sec ≈ 1.8 sim min

    for (const t of this.trains) {
      if (t.status === "halted") {
        t.delayMinutes = Math.min(90, t.delayMinutes + dt * 0.25);
        continue;
      }
      const a = this.stationMap.get(t.route[t.leg])!;
      const b = this.stationMap.get(t.route[t.leg + 1])!;
      const len = Math.max(5, haversineKm(a.lat, a.lng, b.lat, b.lng));
      t.progress += (t.speedKmh * hours) / len;
      while (t.progress >= 1) {
        t.progress -= 1;
        t.leg += 1;
        if (t.leg >= t.route.length - 1) {
          t.route.reverse();
          t.leg = 0;
        }
      }
      this.placeTrain(t);

      if (Math.random() < dt * 0.04) {
        t.delayMinutes = Math.max(0, t.delayMinutes + (Math.random() < 0.55 ? -1 : 1));
      }
      if (t.reroutedUntil > this.wallSim) t.status = "rerouted";
      else t.status = t.delayMinutes > 5 ? "delayed" : "on_time";
    }

    if (this.activeIncidents.length < 2 && Math.random() < dt / 75) {
      this.spawnRandomIncident();
    }

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

  /**
   * Scripted showcase incident: Signal Box S-17 power failure at Kalyan Junction.
   * Exact agent choreography over ~17 simulated seconds.
   */
  triggerDemo() {
    if (this.demoRunning) return;
    this.demoRunning = true;

    const st = this.stationMap.get("KALYAN")!;
    const id = `INC-${String(++this.incSeq).padStart(3, "0")}`;
    const affectedIds = ["TR-2041", "TR-6612", "TR-7789"];
    const affected = this.trains.filter((t) => affectedIds.includes(t.id));
    const pax = affected.reduce((sum, t) => sum + t.passengers, 0);
    const seg = this.segments.find((sg) => sg.id === "SEG-03");

    const inc: Incident = {
      id,
      type: "signal_failure",
      label: "Signal Box S-17 Power Failure",
      severity: "critical",
      locationName: "Kalyan Junction",
      lat: st.lat,
      lng: st.lng,
      affectedTrains: affectedIds,
      raisedAt: this.timeNow(),
      raisedAtSim: this.wallSim,
      status: "detected",
    };
    this.incidents.unshift(inc);
    if (this.incidents.length > 14) this.incidents.pop();

    const tr = (tid: string) => this.trains.find((t) => t.id === tid)!;
    const s = (off: number, fn: () => void) =>
      this.scheduled.push({ due: this.wallSim + off, fn });

    tr("TR-2041").status = "halted";
    tr("TR-6612").status = "halted";
    if (seg) seg.status = "closed";
    this.pushFeed(
      "detected",
      "monitor",
      `🔴 CRITICAL ${id}: Signal failure detected at Kalyan Junction. 3 trains affected.`,
    );

    s(1.5, () =>
      this.think(
        "monitor",
        "Anomaly confirmed — Signal S-17 offline. Power loss detected at signal box. Severity: CRITICAL. Escalating to Orchestrator.",
      ),
    );
    s(3, () => {
      inc.status = "in_resolution";
      this.think(
        "orchestrator",
        "CRITICAL severity incident. Dispatching Incident Response + Route Optimizer simultaneously.",
        "dispatch",
      );
    });
    s(4.5, () =>
      this.think(
        "incident_response",
        "Root cause analysis — S-17 power failure, estimated recovery 45–90 minutes. 3 trains in holding pattern. Requesting immediate rerouting.",
      ),
    );
    s(6, () =>
      this.think(
        "route_optimizer",
        "Evaluating alternatives for TR-2041, TR-6612, TR-7789. Option A: Dombivali bypass (+8 min). Option B: Ulhasnagar bypass (+14 min). Option C: Hold and wait (45+ min).",
      ),
    );
    s(8, () => {
      const t = tr("TR-2041");
      t.status = "rerouted";
      t.reroutedUntil = this.wallSim + 60;
      this.act(
        "route_optimizer",
        "assign_new_route",
        "Selected Dombivali bypass for TR-2041. Assigning new route…",
      );
    });
    s(9.5, () => {
      const t6 = tr("TR-6612");
      t6.status = "on_time";
      t6.delayMinutes = 0;
      this.act(
        "route_optimizer",
        "adjust_platform",
        "Adjusted TR-6612 platform to Platform 3A. Released from hold.",
      );
      const t7 = tr("TR-7789");
      t7.delayMinutes += 3;
      this.pushFeed(
        "step",
        "route_optimizer",
        "TR-7789 authorized via Panvel Loop. +3 min delay accepted.",
      );
    });
    s(11, () =>
      this.think(
        "passenger_comms",
        `Composing updates for ${pax.toLocaleString()} affected passengers across 3 trains.`,
      ),
    );
    s(12.5, () => {
      this.act(
        "passenger_comms",
        "send_push_notification",
        "Station boards updated at Kalyan, Dadar, Thane. Push notifications sent.",
      );
      this.pushFeed(
        "step",
        "passenger_comms",
        "Connecting service alerts issued for 14 passengers at Pune Junction.",
      );
    });
    s(14, () =>
      this.think(
        "maintenance",
        "Signal S-17 repair window analysis. Next available: tonight 01:30–04:00. No trains scheduled.",
      ),
    );
    s(15.5, () =>
      this.act(
        "maintenance",
        "create_maintenance_job",
        "Booked maintenance crew CR-7 for 01:30 tonight. Speed restriction S-17 zone: 30 km/h until repair complete.",
      ),
    );
    s(17, () => {
      inc.status = "resolved";
      inc.resolvedAtSim = this.wallSim;
      this.resolvedCount += 1;
      const secs = Math.round(this.wallSim - inc.raisedAtSim);
      this.resolutionTimes.push(secs);
      const t = tr("TR-2041");
      t.status = "delayed";
      t.delayMinutes = 8;
      t.reroutedUntil = 0;
      this.pushFeed(
        "resolved",
        "orchestrator",
        `✅ Incident resolved in ${secs}s. All 3 trains rerouted. ${pax.toLocaleString()} passengers notified. Maintenance scheduled.`,
      );
      this.onResolved?.({
        title: "Signal Box S-17 Power Failure",
        seconds: secs,
        passengers: pax,
      });
      const order: AgentId[] = [
        "monitor",
        "orchestrator",
        "incident_response",
        "route_optimizer",
        "passenger_comms",
        "maintenance",
      ];
      order.forEach((aid, i) =>
        s(0.5 * (i + 1), () => {
          this.agents[aid].status = "complete";
        }),
      );
      this.demoRunning = false;
    });
    s(20, () => {
      if (seg) seg.status = "clear";
    });
    s(24, () => {
      if (this.activeIncidents.length > 0) return;
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
    });
  }

  private spawnRandomIncident() {
    const type = RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)];
    const busy = new Set(this.activeIncidents.map((i) => i.locationName));
    const candidates = STATIONS.filter((s) => !busy.has(s.name));
    if (candidates.length === 0) return;
    const st = candidates[Math.floor(Math.random() * candidates.length)];
    this.spawnIncident(type, st.id, false);
  }

  private spawnIncident(type: IncidentType, stationId: string, isDemo: boolean) {
    const st = this.stationMap.get(stationId)!;
    const def = INCIDENT_DEFS[type];
    const affected = [...this.trains]
      .filter((t) => t.status !== "halted")
      .sort(
        (x, y) =>
          haversineKm(x.lat, x.lng, st.lat, st.lng) -
          haversineKm(y.lat, y.lng, st.lat, st.lng),
      )
      .slice(0, isDemo ? 3 : 2);
    const seg = this.segments.find((s) => s.from === stationId || s.to === stationId);
    const id = `INC-${String(++this.incSeq).padStart(3, "0")}`;
    const inc: Incident = {
      id,
      type,
      label: def.label,
      severity: def.severity,
      locationName: st.name,
      lat: st.lat,
      lng: st.lng,
      affectedTrains: affected.map((t) => t.id),
      raisedAt: this.timeNow(),
      raisedAtSim: this.wallSim,
      status: "detected",
    };
    this.incidents.unshift(inc);
    if (this.incidents.length > 14) this.incidents.pop();

    const names = affected.map((t) => t.id).join(", ");
    const pax = affected.reduce((s, t) => s + t.passengers, 0);
    const s = (off: number, fn: () => void) =>
      this.scheduled.push({ due: this.wallSim + off, fn });

    s(0.5, () => this.think("monitor", def.detect(st.name)));
    s(1.6, () => {
      this.act(
        "monitor",
        "raise_incident",
        `INCIDENT ${id}: ${def.label} at ${st.name} — severity ${def.severity.toUpperCase()}. Affected: ${names}.`,
        "detected",
      );
    });
    s(3.2, () => {
      inc.status = "in_resolution";
      this.think(
        "orchestrator",
        `Incident ${id} classified ${def.severity.toUpperCase()}. Dispatching Incident Response + Route Optimizer. Priority: passenger safety.`,
        "dispatch",
      );
    });
    s(5.2, () => this.think("incident_response", def.cause(st.name)));
    s(6.8, () => {
      for (const t of affected) t.status = "halted";
      if (seg) seg.status = type === "track_obstruction" ? "closed" : "restricted";
      this.act(
        "incident_response",
        "halt_train",
        `halt_train(${names}) — holding ${affected.length} services clear of ${st.name}.`,
      );
    });
    s(9.5, () =>
      this.think(
        "route_optimizer",
        `Evaluating alternates around ${st.name}: bypass via adjacent corridor adds ~8 min vs ~35 min hold. Selecting bypass.`,
      ),
    );
    s(12.5, () => {
      for (const t of affected) {
        t.status = "rerouted";
        t.reroutedUntil = this.wallSim + 45;
        t.delayMinutes += 6 + Math.floor(Math.random() * 5);
      }
      this.act(
        "route_optimizer",
        "assign_new_route",
        `assign_new_route(${names}) — bypass routes committed. +8 min penalty vs 35 min block.`,
      );
    });
    s(15, () =>
      this.think(
        "passenger_comms",
        `Drafting calm, factual updates for ${pax} passengers with revised ETAs and connection options.`,
      ),
    );
    s(16.5, () =>
      this.act(
        "passenger_comms",
        "send_push_notification",
        `Push alerts + departure boards updated for ${pax} passengers across ${affected.length} services.`,
      ),
    );
    s(19, () => this.think("maintenance", def.maint(st.name)));
    s(20.5, () =>
      this.act(
        "maintenance",
        "create_maintenance_job",
        `create_maintenance_job(${st.name}, 01:00–04:00) — overnight crew booked; speed restriction until repair.`,
      ),
    );
    s(23.5, () => {
      inc.status = "resolved";
      inc.resolvedAtSim = this.wallSim;
      if (seg) seg.status = "clear";
      this.resolvedCount += 1;
      const secs = Math.round(this.wallSim - inc.raisedAtSim);
      this.resolutionTimes.push(secs);
      const ag = this.agents.orchestrator;
      ag.status = "complete";
      ag.activity = `Incident ${id} resolved in ${secs}s. Full audit trail logged.`;
      ag.lastAction = "log_resolution";
      ag.actionsToday += 1;
      this.pushFeed(
        "resolved",
        "orchestrator",
        `RESOLVED ${id}: ${def.label} at ${st.name} cleared in ${secs}s — all services recovering.`,
      );
      this.onResolved?.({
        title: `${def.label} at ${st.name}`,
        seconds: secs,
        passengers: pax,
      });
      if (isDemo) this.demoRunning = false;
    });
    s(28, () => {
      if (this.activeIncidents.length > 0) return;
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
    });
  }

  // ---------- internals ----------

  private placeTrain(t: Train) {
    const a = this.stationMap.get(t.route[t.leg])!;
    const b = this.stationMap.get(t.route[t.leg + 1])!;
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
    ag.status = "analyzing";
    ag.activity = text;
    this.pushFeed(kind, id, text);
  }

  private act(id: AgentId, action: string, text: string, kind: FeedKind = "step") {
    const ag = this.agents[id];
    ag.status = "acting";
    ag.activity = text;
    ag.lastAction = action;
    ag.actionsToday += 1;
    this.pushFeed(kind, id, text);
  }
}
