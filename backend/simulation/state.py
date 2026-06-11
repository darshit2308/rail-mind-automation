"""
state.py — Global shared state object for the entire simulation.
Holds all trains, stations, segments, incidents, and agent events in memory.
"""

from __future__ import annotations

import time
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from simulation.network import Station, TrackSegment, build_stations, build_segments


# ──────────────────────────────────────────────
#  Enums
# ──────────────────────────────────────────────
class TrainStatus(str, Enum):
    RUNNING = "running"
    STOPPED_AT_STATION = "stopped_at_station"
    HALTED = "halted"
    DELAYED = "delayed"


class IncidentSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, Enum):
    DETECTED = "detected"
    IN_RESOLUTION = "in_resolution"
    RESOLVED = "resolved"


class AgentStatus(str, Enum):
    IDLE = "idle"
    ANALYZING = "analyzing"
    ACTING = "acting"
    COMPLETE = "complete"


# ──────────────────────────────────────────────
#  Data Models
# ──────────────────────────────────────────────
class Train(BaseModel):
    id: str
    name: str
    position: dict = Field(default_factory=lambda: {"lat": 0.0, "lng": 0.0})
    current_segment: str = ""
    route: list[str] = []  # ordered list of station IDs
    route_index: int = 0  # which station in route the train is heading toward
    speed_kmh: float = 80.0
    scheduled_arrival: str = ""
    estimated_arrival: str = ""
    delay_minutes: int = 0
    status: TrainStatus = TrainStatus.RUNNING
    priority: str = "normal"
    progress_on_segment: float = 0.0  # 0.0 to 1.0

    def to_dict(self) -> dict:
        return self.model_dump()


class Incident(BaseModel):
    id: str
    type: str  # signal_failure, track_obstruction, train_breakdown, etc.
    severity: IncidentSeverity
    location: dict = Field(default_factory=dict)  # {lat, lng, name}
    affected_trains: list[str] = []
    raised_at: str = ""
    status: IncidentStatus = IncidentStatus.DETECTED
    assigned_agents: list[str] = []
    resolution_log: list[dict] = []

    def to_dict(self) -> dict:
        return self.model_dump()


class AgentState(BaseModel):
    agent_id: str
    name: str
    status: AgentStatus = AgentStatus.IDLE
    current_activity: str = ""
    last_action: str = ""
    actions_count: int = 0
    icon: str = ""

    def to_dict(self) -> dict:
        return self.model_dump()


class AgentEvent(BaseModel):
    agent_id: str
    timestamp: str = ""
    thinking: str = ""
    action: str = ""
    params: dict = Field(default_factory=dict)
    result: str = ""

    def to_dict(self) -> dict:
        return self.model_dump()


# ──────────────────────────────────────────────
#  Global Network State
# ──────────────────────────────────────────────
class NetworkState:
    """
    In-memory state for the entire simulation.
    All trains, stations, segments, incidents, and agent data live here.
    """

    def __init__(self):
        self.stations: dict[str, Station] = build_stations()
        self.segments: dict[str, TrackSegment] = build_segments()
        self.trains: dict[str, Train] = {}
        self.incidents: list[Incident] = []
        self.agent_events: list[AgentEvent] = []
        self.simulation_speed: float = 1.0  # 1x, 2x, 5x
        self.is_running: bool = False
        self.tick_count: int = 0

        # Agent states for the 5+1 agents
        self.agents: dict[str, AgentState] = {
            "orchestrator": AgentState(
                agent_id="orchestrator",
                name="Master Orchestrator",
                icon="🎯",
            ),
            "monitor": AgentState(
                agent_id="monitor",
                name="Network Monitor",
                icon="🔍",
            ),
            "incident_response": AgentState(
                agent_id="incident_response",
                name="Incident Response",
                icon="🚨",
            ),
            "route_optimizer": AgentState(
                agent_id="route_optimizer",
                name="Route Optimizer",
                icon="🗺️",
            ),
            "passenger_comms": AgentState(
                agent_id="passenger_comms",
                name="Passenger Comms",
                icon="📢",
            ),
            "maintenance": AgentState(
                agent_id="maintenance",
                name="Maintenance Scheduler",
                icon="🔧",
            ),
        }

    # ── Train helpers ──────────────────────────
    def get_train(self, train_id: str) -> Train | None:
        return self.trains.get(train_id)

    def get_all_trains(self) -> list[dict]:
        return [t.to_dict() for t in self.trains.values()]

    # ── Incident helpers ───────────────────────
    def add_incident(self, incident: Incident):
        self.incidents.append(incident)

    def get_active_incidents(self) -> list[Incident]:
        return [i for i in self.incidents if i.status != IncidentStatus.RESOLVED]

    def get_incident(self, incident_id: str) -> Incident | None:
        for inc in self.incidents:
            if inc.id == incident_id:
                return inc
        return None

    # ── Segment helpers ────────────────────────
    def get_segment(self, segment_id: str) -> TrackSegment | None:
        return self.segments.get(segment_id)

    def get_track_status(self) -> list[dict]:
        return [
            {
                "id": seg.id,
                "from": seg.from_station,
                "to": seg.to_station,
                "health": seg.health,
                "current_trains": seg.current_trains,
            }
            for seg in self.segments.values()
        ]

    # ── Agent helpers ──────────────────────────
    def update_agent_status(self, agent_id: str, status: AgentStatus, activity: str = ""):
        if agent_id in self.agents:
            self.agents[agent_id].status = status
            if activity:
                self.agents[agent_id].current_activity = activity

    def log_agent_event(self, event: AgentEvent):
        if not event.timestamp:
            event.timestamp = datetime.now().strftime("%H:%M:%S")
        self.agent_events.append(event)

    def get_agents_status(self) -> list[dict]:
        return [a.to_dict() for a in self.agents.values()]

    # ── Analytics helpers ──────────────────────
    def get_analytics_summary(self) -> dict:
        total_incidents = len(self.incidents)
        resolved = len([i for i in self.incidents if i.status == IncidentStatus.RESOLVED])
        active = len(self.get_active_incidents())
        total_delay = sum(t.delay_minutes for t in self.trains.values())
        avg_delay = total_delay / len(self.trains) if self.trains else 0

        return {
            "total_incidents": total_incidents,
            "resolved_incidents": resolved,
            "active_incidents": active,
            "total_trains": len(self.trains),
            "running_trains": len([t for t in self.trains.values() if t.status == TrainStatus.RUNNING]),
            "halted_trains": len([t for t in self.trains.values() if t.status == TrainStatus.HALTED]),
            "average_delay_minutes": round(avg_delay, 1),
            "network_health_score": self._calculate_health_score(),
        }

    def _calculate_health_score(self) -> int:
        """Network health score from 0-100."""
        score = 100
        # Deduct for unhealthy segments
        for seg in self.segments.values():
            if seg.health == "restricted":
                score -= 3
            elif seg.health == "closed":
                score -= 8
        # Deduct for active incidents
        score -= len(self.get_active_incidents()) * 5
        # Deduct for delayed trains
        for t in self.trains.values():
            if t.delay_minutes > 10:
                score -= 2
            if t.status == TrainStatus.HALTED:
                score -= 4
        return max(0, min(100, score))
