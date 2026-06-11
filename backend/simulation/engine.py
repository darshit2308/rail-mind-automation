"""
engine.py — The simulation engine that drives the railway world.
Moves trains along segments, generates random incidents, and handles cascading delays.
Runs as an async loop with a 2-second tick.
"""

from __future__ import annotations

import asyncio
import math
import random
from datetime import datetime, timedelta

from simulation.state import (
    AgentEvent,
    Incident,
    IncidentSeverity,
    IncidentStatus,
    NetworkState,
    Train,
    TrainStatus,
)


# ──────────────────────────────────────────────
#  Incident generation probabilities (per tick)
# ──────────────────────────────────────────────
INCIDENT_CONFIGS = [
    {
        "type": "signal_failure",
        "probability": 0.008,  # ~2/hour at 2s ticks
        "severity": IncidentSeverity.HIGH,
        "resolution": "Reroute or hold trains",
    },
    {
        "type": "track_obstruction",
        "probability": 0.002,  # ~0.5/hour
        "severity": IncidentSeverity.CRITICAL,
        "resolution": "Halt + maintenance",
    },
    {
        "type": "train_breakdown",
        "probability": 0.004,  # ~1/hour
        "severity": IncidentSeverity.HIGH,
        "resolution": "Replace/tow",
    },
    {
        "type": "platform_overcrowding",
        "probability": 0.012,  # ~3/hour
        "severity": IncidentSeverity.MEDIUM,
        "resolution": "Hold next train",
    },
    {
        "type": "weather_speed_restriction",
        "probability": 0.001,  # ~0.3/hour
        "severity": IncidentSeverity.MEDIUM,
        "resolution": "Speed cap all trains",
    },
    {
        "type": "medical_emergency",
        "probability": 0.002,  # ~0.5/hour
        "severity": IncidentSeverity.HIGH,
        "resolution": "Emergency stop, paramedics",
    },
    {
        "type": "points_failure",
        "probability": 0.004,  # ~1/hour
        "severity": IncidentSeverity.HIGH,
        "resolution": "Manual switch",
    },
]

# ──────────────────────────────────────────────
#  8 Initial trains for the demo
# ──────────────────────────────────────────────
INITIAL_TRAINS = [
    {
        "id": "TR-2041",
        "name": "Deccan Express",
        "route": ["CSMT", "DADAR", "THANE", "KALYAN", "LONAVALA", "PUNE"],
        "speed_kmh": 90,
    },
    {
        "id": "TR-1892",
        "name": "Mumbai-Surat Fast",
        "route": ["CSMT", "DADAR", "VASAI", "SURAT"],
        "speed_kmh": 110,
    },
    {
        "id": "TR-3304",
        "name": "Intercity",
        "route": ["NASIK", "IGATPURI", "KALYAN", "THANE", "DADAR", "CSMT"],
        "speed_kmh": 95,
    },
    {
        "id": "TR-0751",
        "name": "Local",
        "route": ["THANE", "KALYAN"],
        "speed_kmh": 60,
    },
    {
        "id": "TR-4417",
        "name": "Rajdhani",
        "route": ["BARODA", "SURAT", "VASAI", "DADAR", "CSMT"],
        "speed_kmh": 130,
    },
    {
        "id": "TR-5521",
        "name": "Freight",
        "route": ["PUNE", "LONAVALA", "KALYAN", "IGATPURI", "NASIK"],
        "speed_kmh": 65,
    },
    {
        "id": "TR-6612",
        "name": "Express",
        "route": ["KALYAN", "LONAVALA", "PUNE"],
        "speed_kmh": 100,
    },
    {
        "id": "TR-7789",
        "name": "Local Shuttle",
        "route": ["DADAR", "THANE", "KALYAN"],
        "speed_kmh": 55,
    },

 
]


def _interpolate_position(
    lat1: float, lng1: float,
    lat2: float, lng2: float,
    progress: float,
) -> dict:
    """Linearly interpolate between two coordinates based on progress (0→1)."""
    return {
        "lat": round(lat1 + (lat2 - lat1) * progress, 4),
        "lng": round(lng1 + (lng2 - lng1) * progress, 4),
    }


def _find_segment(state: NetworkState, from_st: str, to_st: str) -> str | None:
    """Find the segment ID connecting two stations (in either direction)."""
    for seg in state.segments.values():
        if (seg.from_station == from_st and seg.to_station == to_st) or \
           (seg.from_station == to_st and seg.to_station == from_st):
            return seg.id
    return None


def initialize_trains(state: NetworkState):
    """Create the 8 initial demo trains and place them at the start of their routes."""
    for cfg in INITIAL_TRAINS:
        route = cfg["route"]
        start_station = state.stations[route[0]]

        # Find the first segment of the route
        first_seg_id = _find_segment(state, route[0], route[1]) if len(route) > 1 else ""

        now = datetime.now()
        scheduled = now + timedelta(minutes=random.randint(30, 120))

        train = Train(
            id=cfg["id"],
            name=cfg["name"],
            position={"lat": start_station.lat, "lng": start_station.lng},
            current_segment=first_seg_id or "",
            route=route,
            route_index=1,  # heading toward the second station in the route
            speed_kmh=cfg["speed_kmh"],
            scheduled_arrival=scheduled.strftime("%H:%M"),
            estimated_arrival=scheduled.strftime("%H:%M"),
            delay_minutes=0,
            status=TrainStatus.RUNNING,
            progress_on_segment=random.uniform(0.1, 0.4),  # start partially along for visual variety
        )
        state.trains[train.id] = train


def advance_trains(state: NetworkState, delta_t: float = 2.0):
    """
    Move all running trains forward along their route for delta_t seconds.
    Handles segment transitions and station stops.
    """
    for train in state.trains.values():
        if train.status == TrainStatus.HALTED:
            train.delay_minutes += 1
            continue

        if train.status == TrainStatus.STOPPED_AT_STATION:
            # Simulate a station stop (30-90 seconds, we skip after a few ticks)
            train.delay_minutes = max(0, train.delay_minutes)
            train.status = TrainStatus.RUNNING
            continue

        if train.route_index >= len(train.route):
            # Train has reached its destination — reset to loop back
            train.route = list(reversed(train.route))
            train.route_index = 1
            train.progress_on_segment = 0.0
            seg_id = _find_segment(state, train.route[0], train.route[1])
            train.current_segment = seg_id or ""
            continue

        # Calculate progress increment
        current_seg = state.segments.get(train.current_segment)
        if not current_seg:
            # Try to find the right segment
            if train.route_index < len(train.route):
                from_st = train.route[train.route_index - 1]
                to_st = train.route[train.route_index]
                seg_id = _find_segment(state, from_st, to_st)
                if seg_id:
                    train.current_segment = seg_id
                    current_seg = state.segments[seg_id]

        if not current_seg:
            continue

        # Speed adjustment based on segment health
        effective_speed = train.speed_kmh
        if current_seg.health == "restricted":
            effective_speed = min(effective_speed, 40)
        elif current_seg.health == "closed":
            effective_speed = 0
            train.status = TrainStatus.HALTED
            continue

        # distance = speed * time
        distance_km = (effective_speed * delta_t) / 3600.0
        progress_increment = distance_km / max(current_seg.distance_km, 1)
        train.progress_on_segment += progress_increment

        # Interpolate position
        from_station = state.stations.get(current_seg.from_station)
        to_station = state.stations.get(current_seg.to_station)

        if from_station and to_station:
            # Determine direction based on route
            from_st_id = train.route[train.route_index - 1]
            to_st_id = train.route[train.route_index]

            if from_st_id == current_seg.from_station:
                train.position = _interpolate_position(
                    from_station.lat, from_station.lng,
                    to_station.lat, to_station.lng,
                    min(train.progress_on_segment, 1.0),
                )
            else:
                # Train is going in reverse direction on this segment
                train.position = _interpolate_position(
                    to_station.lat, to_station.lng,
                    from_station.lat, from_station.lng,
                    min(train.progress_on_segment, 1.0),
                )

        # Check if train has reached the next station
        if train.progress_on_segment >= 1.0:
            train.progress_on_segment = 0.0
            train.route_index += 1

            if train.route_index < len(train.route):
                # Move to next segment
                from_st = train.route[train.route_index - 1]
                to_st = train.route[train.route_index]
                seg_id = _find_segment(state, from_st, to_st)
                train.current_segment = seg_id or ""
                train.status = TrainStatus.STOPPED_AT_STATION  # brief station stop

                # Snap to station position
                station = state.stations.get(from_st)
                if station:
                    train.position = {"lat": station.lat, "lng": station.lng}


def generate_random_incident(state: NetworkState) -> Incident | None:
    """
    Roll dice for each incident type. If triggered, create an incident
    affecting a random segment and nearby trains.
    """
    for config in INCIDENT_CONFIGS:
        if random.random() < config["probability"] * state.simulation_speed:
            # Pick a random segment for the incident location
            segment = random.choice(list(state.segments.values()))
            from_station = state.stations.get(segment.from_station)

            if not from_station:
                continue

            # Find trains on or near this segment
            affected = []
            for train in state.trains.values():
                if train.current_segment == segment.id:
                    affected.append(train.id)

            # If no trains directly affected, pick a nearby one
            if not affected:
                nearby_trains = [
                    t for t in state.trains.values()
                    if any(
                        s == segment.from_station or s == segment.to_station
                        for s in t.route
                    )
                ]
                if nearby_trains:
                    affected.append(random.choice(nearby_trains).id)

            incident_id = f"INC-{datetime.now().strftime('%Y%m%d')}-{random.randint(100, 999)}"

            incident = Incident(
                id=incident_id,
                type=config["type"],
                severity=config["severity"],
                location={
                    "lat": from_station.lat,
                    "lng": from_station.lng,
                    "name": from_station.name,
                    "segment_id": segment.id,
                },
                affected_trains=affected,
                raised_at=datetime.now().strftime("%H:%M:%S"),
                status=IncidentStatus.DETECTED,
            )

            # Apply immediate effects
            if config["severity"] in (IncidentSeverity.HIGH, IncidentSeverity.CRITICAL):
                segment.health = "restricted"

            if config["severity"] == IncidentSeverity.CRITICAL:
                segment.health = "closed"
                # Halt affected trains
                for tid in affected:
                    train = state.get_train(tid)
                    if train:
                        train.status = TrainStatus.HALTED

            return incident

    return None


def trigger_demo_incident(state: NetworkState) -> Incident:
    """
    Trigger the 'Golden Path Demo' — a signal failure at Kalyan Junction
    affecting multiple trains. This guarantees a compelling demo sequence.
    """
    kalyan = state.stations["KALYAN"]

    # Find trains near Kalyan
    affected = []
    for train in state.trains.values():
        if "KALYAN" in train.route:
            affected.append(train.id)
            if len(affected) >= 3:
                break

    # If no trains near Kalyan, just pick the first two
    if not affected:
        affected = list(state.trains.keys())[:2]

    incident_id = f"INC-{datetime.now().strftime('%Y%m%d')}-DEMO"

    incident = Incident(
        id=incident_id,
        type="signal_failure",
        severity=IncidentSeverity.HIGH,
        location={
            "lat": kalyan.lat,
            "lng": kalyan.lng,
            "name": "Kalyan Junction",
            "segment_id": "SEG-THN-KLY-1",
        },
        affected_trains=affected,
        raised_at=datetime.now().strftime("%H:%M:%S"),
        status=IncidentStatus.DETECTED,
    )

    # Mark the segment as restricted
    seg = state.segments.get("SEG-THN-KLY-1")
    if seg:
        seg.health = "restricted"

    return incident
