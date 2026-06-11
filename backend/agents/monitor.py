"""
monitor.py — Network Monitor Agent (Agent 1).
Runs every 8 seconds, scans live telemetry, and announces incident detections.
"""

from __future__ import annotations

import asyncio

from simulation.state import AgentStatus, Incident, NetworkState, TrainStatus
from websocket.manager import ws_manager


async def monitor_loop(state: NetworkState):
    """Periodic monitor scan — runs every 8 seconds while simulation is active."""
    while state.is_running:
        await asyncio.sleep(8.0 / state.simulation_speed)
        if not state.is_running:
            break

        await _run_scan(state)


async def announce_incident_detection(incident: Incident, state: NetworkState):
    """
    Monitor agent detects and announces a new incident before orchestration begins.
    Matches the demo script: T=0s Monitor detects, T=3s Orchestrator dispatches.
    """
    location = incident.location.get("name", "unknown")
    affected = len(incident.affected_trains)

    state.update_agent_status(
        "monitor",
        AgentStatus.ANALYZING,
        f"Telemetry anomaly near {location} — cross-checking signal and track circuits…",
    )
    await ws_manager.broadcast_agent_thinking(
        "monitor",
        f"Telemetry anomaly: {incident.type.replace('_', ' ')} near {location}. "
        f"Cross-checked against historical pattern — genuine issue confirmed. "
        f"{affected} train(s) affected.",
    )
    await asyncio.sleep(2.5 / state.simulation_speed)

    state.update_agent_status(
        "monitor",
        AgentStatus.COMPLETE,
        f"Incident {incident.id} raised — escalating to Orchestrator.",
    )
    await ws_manager.broadcast_agent_complete(
        "monitor",
        f"Alert raised: {incident.type.replace('_', ' ')} at {location}. Orchestrator notified.",
    )


async def _run_scan(state: NetworkState):
    """Scan network telemetry and report monitor status."""
    delayed = [t for t in state.trains.values() if t.delay_minutes > 10]
    halted = [t for t in state.trains.values() if t.status == TrainStatus.HALTED]
    restricted = [s for s in state.segments.values() if s.health != "clear"]
    active = state.get_active_incidents()

    if active:
        activity = (
            f"Tracking {len(active)} active incident(s). "
            f"Monitoring {len(state.trains)} trains across {len(state.segments)} segments."
        )
    elif delayed or halted or restricted:
        activity = (
            f"Anomalies detected: {len(delayed)} delayed, {len(halted)} halted, "
            f"{len(restricted)} restricted segment(s). Standing by for escalation."
        )
    else:
        activity = (
            f"All clear — scanning {len(state.trains)} trains across "
            f"{len(state.stations)} stations and {len(state.segments)} track segments."
        )

    state.update_agent_status("monitor", AgentStatus.ANALYZING, activity)
    await ws_manager.broadcast_agent_thinking("monitor", activity)

    # Return monitor to idle scanning state unless an incident is in flight
    if not active:
        await asyncio.sleep(0.5)
        state.update_agent_status(
            "monitor",
            AgentStatus.ANALYZING,
            f"Scanning live telemetry across {len(state.stations)} stations "
            f"and {len(state.segments)} track segments…",
        )
