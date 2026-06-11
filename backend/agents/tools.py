"""
tools.py -- All tool implementations that AI agents can invoke via function calling.
Each function operates on the shared NetworkState and returns a result string.
"""

from __future__ import annotations

import random
from datetime import datetime

from simulation.state import (
    AgentEvent,
    Incident,
    IncidentSeverity,
    IncidentStatus,
    NetworkState,
    TrainStatus,
)


# ======================================================
#  Monitor Agent Tools
# ======================================================

def get_all_train_positions(state: NetworkState) -> str:
    """Returns array of train objects with position, speed, delay, status."""
    lines = []
    for t in state.trains.values():
        lines.append(
            f"  {t.id} ({t.name}): lat={t.position['lat']}, lng={t.position['lng']}, "
            f"speed={t.speed_kmh}km/h, delay={t.delay_minutes}min, status={t.status.value}, "
            f"segment={t.current_segment}"
        )
    return "Train positions:\n" + "\n".join(lines)


def get_track_status(state: NetworkState) -> str:
    """Returns track segment health for all segments."""
    lines = []
    for seg in state.segments.values():
        lines.append(
            f"  {seg.id}: {seg.from_station} -> {seg.to_station}, "
            f"health={seg.health}, trains={seg.current_trains}"
        )
    return "Track status:\n" + "\n".join(lines)


def get_signal_status(state: NetworkState) -> str:
    """Returns all signal states (derived from segment health)."""
    lines = []
    for seg in state.segments.values():
        signal = "GREEN" if seg.health == "clear" else "AMBER" if seg.health == "restricted" else "RED"
        lines.append(f"  Signal at {seg.id}: {signal}")
    return "Signal status:\n" + "\n".join(lines)


def raise_incident(state: NetworkState, inc_type: str, location: str, severity: str, affected_trains: list[str]) -> str:
    """Creates a new incident record in the system."""
    station = state.stations.get(location)
    if not station:
        return f"Error: Station '{location}' not found."

    sev_map = {"low": IncidentSeverity.LOW, "medium": IncidentSeverity.MEDIUM,
               "high": IncidentSeverity.HIGH, "critical": IncidentSeverity.CRITICAL}
    sev = sev_map.get(severity.lower(), IncidentSeverity.HIGH)

    incident_id = f"INC-{datetime.now().strftime('%Y%m%d')}-{random.randint(100, 999)}"
    incident = Incident(
        id=incident_id,
        type=inc_type,
        severity=sev,
        location={"lat": station.lat, "lng": station.lng, "name": station.name},
        affected_trains=affected_trains,
        raised_at=datetime.now().strftime("%H:%M:%S"),
        status=IncidentStatus.DETECTED,
    )
    state.add_incident(incident)
    return f"Incident {incident_id} created: {inc_type} at {station.name}, severity={severity}, affecting {affected_trains}"


def query_historical_delay_pattern(state: NetworkState, station: str, time_window: str) -> str:
    """Checks if delay at a station is anomalous based on historical patterns."""
    st = state.stations.get(station)
    if not st:
        return f"No data for station '{station}'"
    # Simulated historical check
    nearby_trains = [t for t in state.trains.values() if station in t.route]
    avg_delay = sum(t.delay_minutes for t in nearby_trains) / max(len(nearby_trains), 1)
    is_anomalous = avg_delay > 8
    return (
        f"Historical delay analysis for {station} ({time_window}): "
        f"Current avg delay = {avg_delay:.1f}min. "
        f"{'ANOMALOUS - exceeds normal pattern' if is_anomalous else 'Within normal range'}"
    )


# ======================================================
#  Incident Response Agent Tools
# ======================================================

def get_incident_details(state: NetworkState, incident_id: str) -> str:
    """Returns full details of a specific incident."""
    inc = state.get_incident(incident_id)
    if not inc:
        return f"Incident {incident_id} not found."
    return (
        f"Incident {inc.id}:\n"
        f"  Type: {inc.type}\n"
        f"  Severity: {inc.severity.value}\n"
        f"  Location: {inc.location}\n"
        f"  Affected trains: {inc.affected_trains}\n"
        f"  Raised at: {inc.raised_at}\n"
        f"  Status: {inc.status.value}\n"
        f"  Assigned agents: {inc.assigned_agents}\n"
        f"  Resolution log: {inc.resolution_log}"
    )


def halt_train(state: NetworkState, train_id: str, reason: str) -> str:
    """Halts a specific train."""
    train = state.get_train(train_id)
    if not train:
        return f"Train {train_id} not found."
    train.status = TrainStatus.HALTED
    return f"Train {train_id} ({train.name}) HALTED. Reason: {reason}"


def release_train(state: NetworkState, train_id: str) -> str:
    """Releases a halted train back to running status."""
    train = state.get_train(train_id)
    if not train:
        return f"Train {train_id} not found."
    train.status = TrainStatus.RUNNING
    return f"Train {train_id} ({train.name}) released and RUNNING."


def change_train_priority(state: NetworkState, train_id: str, priority_level: str) -> str:
    """Changes the priority level of a train."""
    train = state.get_train(train_id)
    if not train:
        return f"Train {train_id} not found."
    train.priority = priority_level
    return f"Train {train_id} priority set to {priority_level}."


def request_route_recalculation(state: NetworkState, train_id: str) -> str:
    """Requests the route optimizer to recalculate a train's path."""
    train = state.get_train(train_id)
    if not train:
        return f"Train {train_id} not found."
    return f"Route recalculation requested for {train_id} ({train.name}). Route Optimizer will handle."


def escalate_to_human(state: NetworkState, incident_id: str, reason: str) -> str:
    """Escalates an incident to human operators (for critical safety events)."""
    inc = state.get_incident(incident_id)
    if not inc:
        return f"Incident {incident_id} not found."
    inc.resolution_log.append({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "agent": "incident_response",
        "action": f"ESCALATED TO HUMAN: {reason}",
    })
    return f"Incident {incident_id} escalated to human operators. Reason: {reason}"


# ======================================================
#  Route Optimizer Agent Tools
# ======================================================

def get_network_topology(state: NetworkState) -> str:
    """Returns the full network graph of stations and tracks."""
    from simulation.network import get_topology_summary
    return get_topology_summary(state.stations, state.segments)


def get_track_availability(state: NetworkState, segment_ids: list[str]) -> str:
    """Returns which tracks are currently free/available."""
    lines = []
    for sid in segment_ids:
        seg = state.get_segment(sid)
        if seg:
            available = seg.health == "clear" and len(seg.current_trains) == 0
            lines.append(f"  {sid}: health={seg.health}, trains_on_track={seg.current_trains}, available={available}")
        else:
            lines.append(f"  {sid}: NOT FOUND")
    return "Track availability:\n" + "\n".join(lines)


def get_train_positions_and_speeds(state: NetworkState) -> str:
    """Returns current state of all trains for routing decisions."""
    return get_all_train_positions(state)


def assign_new_route(state: NetworkState, train_id: str, new_route: list[str]) -> str:
    """Assigns a new route to a train, executing the rerouting."""
    train = state.get_train(train_id)
    if not train:
        return f"Train {train_id} not found."
    old_route = train.route.copy()
    train.route = new_route
    train.route_index = 1
    train.progress_on_segment = 0.0
    train.status = TrainStatus.RUNNING
    return (
        f"Train {train_id} rerouted successfully.\n"
        f"  Old route: {' -> '.join(old_route)}\n"
        f"  New route: {' -> '.join(new_route)}"
    )


def adjust_platform_assignment(state: NetworkState, station_id: str, train_id: str, new_platform: str) -> str:
    """Adjusts which platform a train will arrive at."""
    station = state.stations.get(station_id)
    train = state.get_train(train_id)
    if not station:
        return f"Station {station_id} not found."
    if not train:
        return f"Train {train_id} not found."
    return f"Platform assignment: {train_id} at {station.name} moved to Platform {new_platform}."


# ======================================================
#  Passenger Communications Agent Tools
# ======================================================

def send_station_announcement(state: NetworkState, station_id: str, message: str) -> str:
    """Sends a PA announcement at a specific station."""
    station = state.stations.get(station_id)
    if not station:
        return f"Station {station_id} not found."
    return f"Station announcement at {station.name}: '{message}'"


def send_push_notification(state: NetworkState, affected_train_id: str, message: str) -> str:
    """Sends push notifications to passengers on a specific train."""
    train = state.get_train(affected_train_id)
    if not train:
        return f"Train {affected_train_id} not found."
    return f"Push notification sent to passengers on {affected_train_id} ({train.name}): '{message}'"


def update_departure_board(state: NetworkState, station_id: str, train_id: str, new_time: str, status_text: str) -> str:
    """Updates the departure board at a station for a specific train."""
    station = state.stations.get(station_id)
    if not station:
        return f"Station {station_id} not found."
    return f"Departure board at {station.name} updated: {train_id} -> new time {new_time}, status: {status_text}"


def post_social_media_update(state: NetworkState, platform: str, message: str) -> str:
    """Posts a service update to social media."""
    return f"Social media update posted to {platform}: '{message}'"


def send_connecting_service_alert(state: NetworkState, train_id: str, connecting_trains: list[str]) -> str:
    """Alerts passengers on connecting services about delays."""
    return f"Connecting service alerts sent for {train_id}: affected connections = {connecting_trains}"


# ======================================================
#  Maintenance Scheduler Agent Tools
# ======================================================

def get_maintenance_windows(state: NetworkState, track_segment: str, lookahead_hours: int) -> str:
    """Returns available maintenance windows for a track segment."""
    seg = state.get_segment(track_segment)
    if not seg:
        return f"Segment {track_segment} not found."
    # Simulated maintenance windows
    return (
        f"Maintenance windows for {track_segment} (next {lookahead_hours}h):\n"
        f"  - Tonight 01:00-04:00: Zero passenger services, ideal for repair\n"
        f"  - Tomorrow 13:00-14:30: Low traffic window, suitable for inspection\n"
        f"  - Tomorrow 22:00-02:00: Overnight slot available"
    )


def get_train_schedule_for_segment(state: NetworkState, segment_id: str, hours: int) -> str:
    """Returns train schedule for a segment over a time period."""
    seg = state.get_segment(segment_id)
    if not seg:
        return f"Segment {segment_id} not found."
    trains_on_route = [
        t for t in state.trains.values()
        if seg.from_station in t.route and seg.to_station in t.route
    ]
    lines = [f"Trains using {segment_id} in next {hours}h:"]
    for t in trains_on_route:
        lines.append(f"  {t.id} ({t.name}): speed={t.speed_kmh}km/h, status={t.status.value}")
    return "\n".join(lines)


def create_maintenance_job(state: NetworkState, segment_id: str, start_time: str, end_time: str, team: str, description: str) -> str:
    """Creates a maintenance job for a track segment."""
    seg = state.get_segment(segment_id)
    if not seg:
        return f"Segment {segment_id} not found."
    return (
        f"Maintenance job created:\n"
        f"  Segment: {segment_id} ({seg.from_station} -> {seg.to_station})\n"
        f"  Window: {start_time} - {end_time}\n"
        f"  Team: {team}\n"
        f"  Description: {description}\n"
        f"  Status: SCHEDULED"
    )


def flag_segment_for_speed_restriction(state: NetworkState, segment_id: str, max_speed: int) -> str:
    """Flags a segment with a temporary speed restriction."""
    seg = state.get_segment(segment_id)
    if not seg:
        return f"Segment {segment_id} not found."
    seg.health = "restricted"
    seg.max_speed_kmh = max_speed
    state.queue_network_alert(segment_id, seg.health)
    return f"Segment {segment_id} flagged: speed restriction {max_speed}km/h until maintenance complete."


def get_maintenance_crew_availability(state: NetworkState) -> str:
    """Returns available maintenance crews."""
    return (
        "Available maintenance crews:\n"
        "  CR-7 (Signal & Power): Available from 01:00 tonight\n"
        "  CR-12 (Track & Points): Available from 22:00 tonight\n"
        "  CR-3 (Emergency Response): Available NOW\n"
        "  CR-9 (Electrical Systems): Available from 02:00 tomorrow"
    )


# ======================================================
#  Orchestrator Tools
# ======================================================

def log_resolution(state: NetworkState, incident_id: str, resolution_summary: str) -> str:
    """Logs the final resolution summary for an incident."""
    inc = state.get_incident(incident_id)
    if not inc:
        return f"Incident {incident_id} not found."
    inc.status = IncidentStatus.RESOLVED
    inc.resolution_log.append({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "agent": "orchestrator",
        "action": f"RESOLVED: {resolution_summary}",
    })
    # Restore affected segment health
    if inc.location.get("segment_id"):
        seg = state.get_segment(inc.location["segment_id"])
        if seg and seg.health != "clear":
            seg.health = "clear"
            state.queue_network_alert(seg.id, seg.health)

    # Release halted trains
    for tid in inc.affected_trains:
        train = state.get_train(tid)
        if train and train.status == TrainStatus.HALTED:
            train.status = TrainStatus.RUNNING

    return f"Incident {incident_id} marked RESOLVED. Summary: {resolution_summary}"


# ======================================================
#  Tool executor (dispatches tool calls from Claude)
# ======================================================

def execute_tool(tool_name: str, tool_input: dict, state: NetworkState) -> str:
    """Execute a tool by name with the given input against the shared state."""
    tool_map = {
        # Monitor
        "get_all_train_positions": lambda: get_all_train_positions(state),
        "get_track_status": lambda: get_track_status(state),
        "get_signal_status": lambda: get_signal_status(state),
        "raise_incident": lambda: raise_incident(state, tool_input.get("type", ""), tool_input.get("location", ""), tool_input.get("severity", "high"), tool_input.get("affected_trains", [])),
        "query_historical_delay_pattern": lambda: query_historical_delay_pattern(state, tool_input.get("station", ""), tool_input.get("time_window", "1h")),

        # Incident Response
        "get_incident_details": lambda: get_incident_details(state, tool_input.get("incident_id", "")),
        "halt_train": lambda: halt_train(state, tool_input.get("train_id", ""), tool_input.get("reason", "")),
        "release_train": lambda: release_train(state, tool_input.get("train_id", "")),
        "change_train_priority": lambda: change_train_priority(state, tool_input.get("train_id", ""), tool_input.get("priority_level", "normal")),
        "request_route_recalculation": lambda: request_route_recalculation(state, tool_input.get("train_id", "")),
        "escalate_to_human": lambda: escalate_to_human(state, tool_input.get("incident_id", ""), tool_input.get("reason", "")),

        # Route Optimizer
        "get_network_topology": lambda: get_network_topology(state),
        "get_track_availability": lambda: get_track_availability(state, tool_input.get("segment_ids", [])),
        "get_train_positions_and_speeds": lambda: get_train_positions_and_speeds(state),
        "assign_new_route": lambda: assign_new_route(state, tool_input.get("train_id", ""), tool_input.get("new_route", [])),
        "adjust_platform_assignment": lambda: adjust_platform_assignment(state, tool_input.get("station_id", ""), tool_input.get("train_id", ""), tool_input.get("new_platform", "")),

        # Passenger Comms
        "send_station_announcement": lambda: send_station_announcement(state, tool_input.get("station_id", ""), tool_input.get("message", "")),
        "send_push_notification": lambda: send_push_notification(state, tool_input.get("affected_train_id", ""), tool_input.get("message", "")),
        "update_departure_board": lambda: update_departure_board(state, tool_input.get("station_id", ""), tool_input.get("train_id", ""), tool_input.get("new_time", ""), tool_input.get("status_text", "")),
        "post_social_media_update": lambda: post_social_media_update(state, tool_input.get("platform", ""), tool_input.get("message", "")),
        "send_connecting_service_alert": lambda: send_connecting_service_alert(state, tool_input.get("train_id", ""), tool_input.get("connecting_trains", [])),

        # Maintenance
        "get_maintenance_windows": lambda: get_maintenance_windows(state, tool_input.get("track_segment", ""), tool_input.get("lookahead_hours", 24)),
        "get_train_schedule_for_segment": lambda: get_train_schedule_for_segment(state, tool_input.get("segment_id", ""), tool_input.get("hours", 12)),
        "create_maintenance_job": lambda: create_maintenance_job(state, tool_input.get("segment_id", ""), tool_input.get("start_time", ""), tool_input.get("end_time", ""), tool_input.get("team", ""), tool_input.get("description", "")),
        "flag_segment_for_speed_restriction": lambda: flag_segment_for_speed_restriction(state, tool_input.get("segment_id", ""), tool_input.get("max_speed", 40)),
        "get_maintenance_crew_availability": lambda: get_maintenance_crew_availability(state),

        # Orchestrator
        "log_resolution": lambda: log_resolution(state, tool_input.get("incident_id", ""), tool_input.get("resolution_summary", "")),
    }

    executor = tool_map.get(tool_name)
    if not executor:
        return f"Unknown tool: {tool_name}"

    try:
        return executor()
    except Exception as e:
        return f"Tool execution error ({tool_name}): {str(e)}"
