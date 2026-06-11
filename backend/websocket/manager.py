"""
manager.py — WebSocket connection manager using python-socketio.
Handles broadcasting real-time events to all connected frontend clients.

Events emitted:
  - train:update      → New position + status for all trains
  - incident:new      → New incident detected
  - incident:update   → Status change on existing incident
  - agent:thinking    → Agent's current reasoning step (stream)
  - agent:action      → Agent executed a tool
  - agent:complete    → Agent finished its task
  - network:alert     → Track or signal state change
  - resolution:complete → Full incident resolved summary
"""

from __future__ import annotations

import socketio


# Create an async Socket.IO server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",  # Allow all origins for dev
    logger=False,
    engineio_logger=False,
)


@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")


class WebSocketManager:
    """
    Wrapper around the Socket.IO server to provide typed broadcast methods
    for the simulation and agent systems.
    """

    def __init__(self, server: socketio.AsyncServer):
        self.server = server

    async def broadcast(self, event_data: dict):
        """
        Generic broadcast. event_data must have a 'type' key.
        The 'type' value becomes the Socket.IO event name.
        """
        event_type = event_data.get("type", "unknown")
        await self.server.emit(event_type, event_data)

    async def broadcast_train_update(self, trains: list[dict]):
        """Broadcast all train positions and statuses."""
        await self.server.emit("train:update", {"trains": trains})

    async def broadcast_incident_new(self, incident: dict):
        """Broadcast a new incident."""
        await self.server.emit("incident:new", {"incident": incident})

    async def broadcast_incident_update(self, incident: dict):
        """Broadcast an update to an existing incident."""
        await self.server.emit("incident:update", {"incident": incident})

    async def broadcast_agent_thinking(self, agent_id: str, content: str):
        """Stream an agent's current reasoning step."""
        await self.server.emit("agent:thinking", {
            "type": "agent:thinking",
            "agent": agent_id,
            "content": content,
        })

    async def broadcast_agent_action(self, agent_id: str, action: str, params: dict):
        """Broadcast that an agent executed a tool call."""
        await self.server.emit("agent:action", {
            "type": "agent:action",
            "agent": agent_id,
            "action": action,
            "params": params,
        })

    async def broadcast_agent_complete(self, agent_id: str, summary: str):
        """Broadcast that an agent has finished its task."""
        await self.server.emit("agent:complete", {
            "type": "agent:complete",
            "agent": agent_id,
            "summary": summary,
        })

    async def broadcast_network_alert(self, segment_id: str, new_health: str):
        """Broadcast a track or signal state change."""
        await self.server.emit("network:alert", {
            "type": "network:alert",
            "segment_id": segment_id,
            "health": new_health,
        })

    async def broadcast_resolution_complete(self, incident_id: str, summary: str):
        """Broadcast that an incident has been fully resolved."""
        await self.server.emit("resolution:complete", {
            "type": "resolution:complete",
            "incident_id": incident_id,
            "summary": summary,
        })


# Singleton instance
ws_manager = WebSocketManager(sio)
