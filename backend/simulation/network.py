"""
network.py — Track topology, segments, and stations for the simplified Indian railway network.
12 stations, 18 track segments using real Indian city coordinates.
"""

from pydantic import BaseModel


class Station(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    capacity: int = 5  # max trains at station at once
    current_trains: list[str] = []


class TrackSegment(BaseModel):
    id: str
    from_station: str
    to_station: str
    distance_km: float
    max_speed_kmh: int = 120
    health: str = "clear"  # clear | restricted | closed
    current_trains: list[str] = []


# ──────────────────────────────────────────────
#  12 Stations (real Indian city coordinates)
# ──────────────────────────────────────────────
STATIONS: list[dict] = [
    {"id": "CSMT", "name": "CSMT Mumbai", "lat": 18.9398, "lng": 72.8354},
    {"id": "PNVL", "name": "Panvel", "lat": 18.9934, "lng": 73.1135},
    {"id": "PUNE", "name": "Pune Junction", "lat": 18.5280, "lng": 73.8742},
    {"id": "KALYAN", "name": "Kalyan Junction", "lat": 19.2403, "lng": 73.1305},
    {"id": "THANE", "name": "Thane", "lat": 19.1843, "lng": 72.9781},
    {"id": "NASIK", "name": "Nashik Road", "lat": 19.9975, "lng": 73.7898},
    {"id": "IGATPURI", "name": "Igatpuri", "lat": 19.6943, "lng": 73.5572},
    {"id": "DADAR", "name": "Dadar", "lat": 19.0186, "lng": 72.8425},
    {"id": "LONAVALA", "name": "Lonavala", "lat": 18.7493, "lng": 73.4033},
    {"id": "VASAI", "name": "Vasai Road", "lat": 19.3653, "lng": 72.8355},
    {"id": "SURAT", "name": "Surat", "lat": 21.1702, "lng": 72.8311},
    {"id": "BARODA", "name": "Vadodara", "lat": 22.3072, "lng": 73.1812},
]


# ──────────────────────────────────────────────
#  18 Track Segments connecting stations
# ──────────────────────────────────────────────
TRACK_SEGMENTS: list[dict] = [
    # Main Mumbai-Pune corridor
    {"id": "SEG-CSMT-DAD-1", "from_station": "CSMT", "to_station": "DADAR", "distance_km": 10, "max_speed_kmh": 80},
    {"id": "SEG-DAD-THN-1", "from_station": "DADAR", "to_station": "THANE", "distance_km": 22, "max_speed_kmh": 100},
    {"id": "SEG-THN-KLY-1", "from_station": "THANE", "to_station": "KALYAN", "distance_km": 18, "max_speed_kmh": 110},
    {"id": "SEG-KLY-LON-1", "from_station": "KALYAN", "to_station": "LONAVALA", "distance_km": 55, "max_speed_kmh": 100},
    {"id": "SEG-LON-PUN-1", "from_station": "LONAVALA", "to_station": "PUNE", "distance_km": 62, "max_speed_kmh": 110},

    # Mumbai-Panvel branch
    {"id": "SEG-CSMT-PNV-1", "from_station": "CSMT", "to_station": "PNVL", "distance_km": 46, "max_speed_kmh": 90},
    {"id": "SEG-PNV-LON-1", "from_station": "PNVL", "to_station": "LONAVALA", "distance_km": 78, "max_speed_kmh": 100},

    # Kalyan-Nashik corridor (via Igatpuri)
    {"id": "SEG-KLY-IGT-1", "from_station": "KALYAN", "to_station": "IGATPURI", "distance_km": 76, "max_speed_kmh": 90},
    {"id": "SEG-IGT-NSK-1", "from_station": "IGATPURI", "to_station": "NASIK", "distance_km": 45, "max_speed_kmh": 100},

    # Igatpuri-Pune (cross-link)
    {"id": "SEG-IGT-PUN-1", "from_station": "IGATPURI", "to_station": "PUNE", "distance_km": 140, "max_speed_kmh": 100},

    # Mumbai-Vasai-Surat-Baroda corridor
    {"id": "SEG-DAD-VAS-1", "from_station": "DADAR", "to_station": "VASAI", "distance_km": 48, "max_speed_kmh": 100},
    {"id": "SEG-VAS-SUR-1", "from_station": "VASAI", "to_station": "SURAT", "distance_km": 240, "max_speed_kmh": 130},
    {"id": "SEG-SUR-BAR-1", "from_station": "SURAT", "to_station": "BARODA", "distance_km": 132, "max_speed_kmh": 130},

    # Panvel-Pune direct
    {"id": "SEG-PNV-PUN-1", "from_station": "PNVL", "to_station": "PUNE", "distance_km": 120, "max_speed_kmh": 100},

    # Kalyan-Vasai (western link)
    {"id": "SEG-KLY-VAS-1", "from_station": "KALYAN", "to_station": "VASAI", "distance_km": 30, "max_speed_kmh": 90},

    # Nashik-Pune (southern cross-link)
    {"id": "SEG-NSK-PUN-1", "from_station": "NASIK", "to_station": "PUNE", "distance_km": 210, "max_speed_kmh": 100},

    # Thane-Panvel (harbour line)
    {"id": "SEG-THN-PNV-1", "from_station": "THANE", "to_station": "PNVL", "distance_km": 26, "max_speed_kmh": 80},

    # Nasik-Surat (northern corridor)
    {"id": "SEG-NSK-SUR-1", "from_station": "NASIK", "to_station": "SURAT", "distance_km": 180, "max_speed_kmh": 110},
]


def build_stations() -> dict[str, Station]:
    """Build station objects indexed by station ID."""
    return {s["id"]: Station(**s) for s in STATIONS}


def build_segments() -> dict[str, TrackSegment]:
    """Build track segment objects indexed by segment ID."""
    return {s["id"]: TrackSegment(**s) for s in TRACK_SEGMENTS}


def get_topology_summary(stations: dict[str, Station], segments: dict[str, TrackSegment]) -> str:
    """Return a human-readable topology summary for AI agent context."""
    lines = ["Railway Network Topology:", ""]
    lines.append("Stations:")
    for s in stations.values():
        lines.append(f"  - {s.id} ({s.name})")
    lines.append("")
    lines.append("Track Segments:")
    for seg in segments.values():
        lines.append(
            f"  - {seg.id}: {seg.from_station} → {seg.to_station} "
            f"({seg.distance_km}km, max {seg.max_speed_kmh}km/h, health: {seg.health})"
        )
    return "\n".join(lines)
