"""
main.py — FastAPI application entry point for the RailMind backend.
Mounts Socket.IO, starts the simulation loop, and exposes REST API endpoints.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

import socketio
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agents.orchestrator import handle_incident as orchestrate_incident
from simulation.engine import (
    advance_trains,
    generate_random_incident,
    initialize_trains,
    trigger_demo_incident,
)
from simulation.state import NetworkState
from websocket.manager import sio, ws_manager

# Load environment variables
load_dotenv()

# ──────────────────────────────────────────────
#  Global state
# ──────────────────────────────────────────────
state = NetworkState()


# ──────────────────────────────────────────────
#  Simulation loop (runs in background)
# ──────────────────────────────────────────────
async def simulation_loop():
    """Main simulation loop — runs every 2 seconds."""
    while state.is_running:
        state.tick_count += 1

        # Move all trains
        advance_trains(state, delta_t=2.0 * state.simulation_speed)

        # Random incident injection
        incident = generate_random_incident(state)
        if incident:
            state.add_incident(incident)
            await ws_manager.broadcast_incident_new(incident.to_dict())

            # Dispatch the orchestrator to coordinate agent resolution
            asyncio.create_task(orchestrate_incident(incident, state))

        # Broadcast updated train positions
        await ws_manager.broadcast_train_update(state.get_all_trains())

        await asyncio.sleep(2.0 / state.simulation_speed)


# ──────────────────────────────────────────────
#  App lifecycle
# ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the simulation when the server boots."""
    print("RailMind -- Initializing simulation...")
    initialize_trains(state)
    state.is_running = True
    simulation_task = asyncio.create_task(simulation_loop())
    print(f"Simulation started with {len(state.trains)} trains")
    yield
    # Shutdown
    state.is_running = False
    simulation_task.cancel()
    print("🛑 Simulation stopped.")


# ──────────────────────────────────────────────
#  FastAPI app
# ──────────────────────────────────────────────
app = FastAPI(
    title="RailMind API",
    description="The Brain Behind Every Train — Smart Rail Control Room Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO as an ASGI sub-application
sio_asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)


# ──────────────────────────────────────────────
#  REST Endpoints
# ──────────────────────────────────────────────

@app.get("/api/network/state")
async def get_network_state():
    """Get full network state — all trains, tracks, and signals."""
    return {
        "trains": state.get_all_trains(),
        "tracks": state.get_track_status(),
        "stations": [
            {"id": s.id, "name": s.name, "lat": s.lat, "lng": s.lng}
            for s in state.stations.values()
        ],
    }


@app.get("/api/incidents")
async def get_incidents():
    """Get all active + recent incidents."""
    return {
        "incidents": [i.to_dict() for i in state.incidents],
        "active_count": len(state.get_active_incidents()),
    }


@app.get("/api/agents/status")
async def get_agents_status():
    """Get current state of all 5 agents."""
    return {"agents": state.get_agents_status()}


@app.post("/api/incidents/trigger")
async def trigger_incident():
    """Manually inject a demo incident (the 'Golden Path Demo')."""
    incident = trigger_demo_incident(state)
    state.add_incident(incident)
    await ws_manager.broadcast_incident_new(incident.to_dict())

    # Dispatch the orchestrator to coordinate agent resolution
    asyncio.create_task(orchestrate_incident(incident, state))

    return {
        "message": "Demo incident triggered",
        "incident": incident.to_dict(),
    }


@app.post("/api/simulation/speed")
async def set_simulation_speed(speed: float = 1.0):
    """Adjust simulation speed (1x, 2x, 5x)."""
    if speed not in (1.0, 2.0, 5.0):
        return {"error": "Speed must be 1.0, 2.0, or 5.0"}
    state.simulation_speed = speed
    return {"message": f"Simulation speed set to {speed}x"}


@app.get("/api/analytics/summary")
async def get_analytics_summary():
    """Get delay stats, resolution times, and network health."""
    return state.get_analytics_summary()


@app.get("/api/network/topology")
async def get_network_topology():
    """Get the static network graph (stations and segments)."""
    return {
        "stations": [
            {"id": s.id, "name": s.name, "lat": s.lat, "lng": s.lng, "capacity": s.capacity}
            for s in state.stations.values()
        ],
        "segments": [
            {
                "id": seg.id,
                "from_station": seg.from_station,
                "to_station": seg.to_station,
                "distance_km": seg.distance_km,
                "max_speed_kmh": seg.max_speed_kmh,
                "health": seg.health,
            }
            for seg in state.segments.values()
        ],
    }


@app.get("/")
async def root():
    return {
        "name": "RailMind API",
        "tagline": "The Brain Behind Every Train",
        "version": "1.0.0",
        "simulation": {
            "running": state.is_running,
            "trains": len(state.trains),
            "speed": state.simulation_speed,
        },
    }


# ──────────────────────────────────────────────
#  Run with: uvicorn main:sio_asgi_app --reload --port 8000
#  NOTE: We export sio_asgi_app (not app) so Socket.IO works
# ──────────────────────────────────────────────
