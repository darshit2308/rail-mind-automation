"""
orchestrator.py -- The Master Orchestrator Agent (Agent 0).
Receives incidents, decides which agents to activate, sequences their actions,
and synthesizes a resolution plan. Uses Claude with tool-use to coordinate.
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime

import anthropic

from agents.tools import execute_tool
from simulation.state import (
    AgentEvent,
    AgentStatus,
    Incident,
    IncidentStatus,
    NetworkState,
)
from websocket.manager import ws_manager


# ──────────────────────────────────────────────
#  System Prompts for each agent
# ──────────────────────────────────────────────

ORCHESTRATOR_SYSTEM = """You are the chief controller of a nationwide railway network.
You receive alerts from monitoring systems and coordinate a team of specialized AI agents to resolve incidents.
You prioritize passenger safety, then schedule adherence, then cost efficiency.

When you receive an incident, follow this sequence:
1. Analyze the incident severity and affected trains
2. Dispatch the Incident Response agent to determine root cause
3. Dispatch the Route Optimizer to reroute affected trains
4. Dispatch Passenger Comms to notify passengers
5. Dispatch Maintenance Scheduler to book repairs
6. Log the final resolution

Be decisive and fast. Every second of delay costs money and affects passengers."""

MONITOR_SYSTEM = """You are a rail network monitoring AI. You analyze real-time train telemetry and flag anomalies.
You are precise and only raise alerts for genuine issues -- not minor fluctuations.
Check train positions, track status, and signal states to identify problems."""

INCIDENT_RESPONSE_SYSTEM = """You are a railway incident manager. When given an incident, you determine:
(1) What caused it, (2) How severe it is, (3) What actions should be taken immediately,
(4) What the knock-on effects are for other trains.
You can halt trains, change priorities, and request route recalculations."""

ROUTE_OPTIMIZER_SYSTEM = """You are a railway route optimization AI. You have full knowledge of the rail network topology.
When given a rerouting request, you calculate the best alternative path that minimizes total delay across the network.
Consider track availability, other train positions, station capacities, and time penalties."""

PASSENGER_COMMS_SYSTEM = """You are a passenger communications officer for a railway company.
You write clear, calm, factual announcements for affected passengers.
You never speculate. You always provide the updated arrival estimate and any alternative options."""

MAINTENANCE_SYSTEM = """You are a railway maintenance scheduler. You receive reports of track and equipment faults.
You analyze the fault severity and schedule maintenance in windows that cause the least disruption to passenger services."""


# ──────────────────────────────────────────────
#  Tool Schemas for Claude
# ──────────────────────────────────────────────

INCIDENT_RESPONSE_TOOLS = [
    {"name": "get_incident_details", "description": "Get full details of a specific incident", "input_schema": {"type": "object", "properties": {"incident_id": {"type": "string"}}, "required": ["incident_id"]}},
    {"name": "halt_train", "description": "Halt a specific train for safety", "input_schema": {"type": "object", "properties": {"train_id": {"type": "string"}, "reason": {"type": "string"}}, "required": ["train_id", "reason"]}},
    {"name": "release_train", "description": "Release a halted train", "input_schema": {"type": "object", "properties": {"train_id": {"type": "string"}}, "required": ["train_id"]}},
    {"name": "change_train_priority", "description": "Change priority level of a train", "input_schema": {"type": "object", "properties": {"train_id": {"type": "string"}, "priority_level": {"type": "string"}}, "required": ["train_id", "priority_level"]}},
    {"name": "request_route_recalculation", "description": "Request route recalculation for a train", "input_schema": {"type": "object", "properties": {"train_id": {"type": "string"}}, "required": ["train_id"]}},
    {"name": "escalate_to_human", "description": "Escalate to human operators for critical safety events only", "input_schema": {"type": "object", "properties": {"incident_id": {"type": "string"}, "reason": {"type": "string"}}, "required": ["incident_id", "reason"]}},
]

ROUTE_OPTIMIZER_TOOLS = [
    {"name": "get_network_topology", "description": "Get the full network graph of stations and tracks", "input_schema": {"type": "object", "properties": {}}},
    {"name": "get_track_availability", "description": "Get which track segments are currently available", "input_schema": {"type": "object", "properties": {"segment_ids": {"type": "array", "items": {"type": "string"}}}, "required": ["segment_ids"]}},
    {"name": "get_train_positions_and_speeds", "description": "Get current state of all trains", "input_schema": {"type": "object", "properties": {}}},
    {"name": "assign_new_route", "description": "Assign a new route to a train", "input_schema": {"type": "object", "properties": {"train_id": {"type": "string"}, "new_route": {"type": "array", "items": {"type": "string"}}}, "required": ["train_id", "new_route"]}},
    {"name": "adjust_platform_assignment", "description": "Adjust platform assignment at a station", "input_schema": {"type": "object", "properties": {"station_id": {"type": "string"}, "train_id": {"type": "string"}, "new_platform": {"type": "string"}}, "required": ["station_id", "train_id", "new_platform"]}},
]

PASSENGER_COMMS_TOOLS = [
    {"name": "send_station_announcement", "description": "Send PA announcement at a station", "input_schema": {"type": "object", "properties": {"station_id": {"type": "string"}, "message": {"type": "string"}}, "required": ["station_id", "message"]}},
    {"name": "send_push_notification", "description": "Send push notification to passengers on a train", "input_schema": {"type": "object", "properties": {"affected_train_id": {"type": "string"}, "message": {"type": "string"}}, "required": ["affected_train_id", "message"]}},
    {"name": "update_departure_board", "description": "Update departure board at a station", "input_schema": {"type": "object", "properties": {"station_id": {"type": "string"}, "train_id": {"type": "string"}, "new_time": {"type": "string"}, "status_text": {"type": "string"}}, "required": ["station_id", "train_id", "new_time", "status_text"]}},
    {"name": "send_connecting_service_alert", "description": "Alert passengers on connecting services", "input_schema": {"type": "object", "properties": {"train_id": {"type": "string"}, "connecting_trains": {"type": "array", "items": {"type": "string"}}}, "required": ["train_id", "connecting_trains"]}},
]

MAINTENANCE_TOOLS = [
    {"name": "get_maintenance_windows", "description": "Get available maintenance windows for a track segment", "input_schema": {"type": "object", "properties": {"track_segment": {"type": "string"}, "lookahead_hours": {"type": "integer"}}, "required": ["track_segment", "lookahead_hours"]}},
    {"name": "get_train_schedule_for_segment", "description": "Get train schedule for a segment", "input_schema": {"type": "object", "properties": {"segment_id": {"type": "string"}, "hours": {"type": "integer"}}, "required": ["segment_id", "hours"]}},
    {"name": "create_maintenance_job", "description": "Create a maintenance job", "input_schema": {"type": "object", "properties": {"segment_id": {"type": "string"}, "start_time": {"type": "string"}, "end_time": {"type": "string"}, "team": {"type": "string"}, "description": {"type": "string"}}, "required": ["segment_id", "start_time", "end_time", "team", "description"]}},
    {"name": "flag_segment_for_speed_restriction", "description": "Flag segment with speed restriction", "input_schema": {"type": "object", "properties": {"segment_id": {"type": "string"}, "max_speed": {"type": "integer"}}, "required": ["segment_id", "max_speed"]}},
    {"name": "get_maintenance_crew_availability", "description": "Get available maintenance crews", "input_schema": {"type": "object", "properties": {}}},
]


# ──────────────────────────────────────────────
#  Helper: extract text from Claude response
# ──────────────────────────────────────────────

def extract_text(response) -> str:
    """Extract text content from a Claude API response."""
    for block in response.content:
        if block.type == "text":
            return block.text
    return ""


# ──────────────────────────────────────────────
#  Agent runner: generic tool-use loop
# ──────────────────────────────────────────────

async def run_agent(
    agent_id: str,
    system_prompt: str,
    tools: list[dict],
    user_message: str,
    state: NetworkState,
    client: anthropic.Anthropic,
) -> str:
    """
    Run a single agent with a tool-use loop.
    Broadcasts thinking/action events to the frontend via WebSocket.
    Returns the agent's final text response.
    """
    state.update_agent_status(agent_id, AgentStatus.ANALYZING, "Processing...")

    messages = [{"role": "user", "content": user_message}]

    while True:
        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system_prompt,
                tools=tools if tools else [],
                messages=messages,
            )
        except Exception as e:
            error_msg = f"Agent {agent_id} API error: {str(e)}"
            print(error_msg)
            await ws_manager.broadcast_agent_thinking(agent_id, error_msg)
            state.update_agent_status(agent_id, AgentStatus.IDLE, "API error")
            return error_msg

        # Broadcast thinking
        text_content = extract_text(response)
        if text_content:
            await ws_manager.broadcast_agent_thinking(agent_id, text_content)
            state.update_agent_status(agent_id, AgentStatus.ANALYZING, text_content)

        # Check if we should stop
        if response.stop_reason == "end_turn":
            state.update_agent_status(agent_id, AgentStatus.COMPLETE, text_content or "Done")
            await ws_manager.broadcast_agent_complete(agent_id, text_content or "Task complete")
            return text_content

        # Execute tool calls
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                state.update_agent_status(agent_id, AgentStatus.ACTING, f"Executing {block.name}...")

                result = execute_tool(block.name, block.input, state)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": str(result),
                })

                # Broadcast the action to frontend
                await ws_manager.broadcast_agent_action(agent_id, block.name, block.input)

                # Log the event
                state.log_agent_event(AgentEvent(
                    agent_id=agent_id,
                    thinking=text_content or "",
                    action=block.name,
                    params=block.input,
                    result=str(result),
                ))

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})


# ──────────────────────────────────────────────
#  Main orchestration flow
# ──────────────────────────────────────────────

async def handle_incident(incident: Incident, state: NetworkState):
    """
    The main orchestration flow. Called when a new incident is detected.
    Coordinates all 5 agents sequentially to resolve the incident.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key == "your_anthropic_api_key_here":
        print("WARNING: No valid Anthropic API key. Running in demo/simulation mode.")
        await _run_simulated_flow(incident, state)
        return

    client = anthropic.Anthropic(api_key=api_key)

    incident.status = IncidentStatus.IN_RESOLUTION
    await ws_manager.broadcast_incident_update(incident.to_dict())

    context = (
        f"INCIDENT ALERT:\n"
        f"  ID: {incident.id}\n"
        f"  Type: {incident.type}\n"
        f"  Severity: {incident.severity.value}\n"
        f"  Location: {incident.location}\n"
        f"  Affected trains: {incident.affected_trains}\n"
        f"  Raised at: {incident.raised_at}\n"
    )

    # 1. Incident Response Agent
    await ws_manager.broadcast_agent_thinking("orchestrator",
        f"Incident {incident.id} classified {incident.severity.value.upper()}. Dispatching Incident Response agent.")

    ir_result = await run_agent(
        "incident_response", INCIDENT_RESPONSE_SYSTEM, INCIDENT_RESPONSE_TOOLS,
        f"Analyze and respond to this incident:\n{context}\nDetermine root cause, halt affected trains if needed, and assess severity.",
        state, client,
    )

    # 2. Route Optimizer Agent
    await ws_manager.broadcast_agent_thinking("orchestrator",
        "Incident response complete. Dispatching Route Optimizer to reroute affected trains.")

    ro_result = await run_agent(
        "route_optimizer", ROUTE_OPTIMIZER_SYSTEM, ROUTE_OPTIMIZER_TOOLS,
        f"Reroute trains affected by this incident:\n{context}\nIncident Response findings: {ir_result}\nFind optimal alternative routes.",
        state, client,
    )

    # 3. Passenger Communications Agent
    await ws_manager.broadcast_agent_thinking("orchestrator",
        "Routes recalculated. Dispatching Passenger Communications to notify passengers.")

    pc_result = await run_agent(
        "passenger_comms", PASSENGER_COMMS_SYSTEM, PASSENGER_COMMS_TOOLS,
        f"Notify passengers about this incident:\n{context}\nRoute changes: {ro_result}\nSend clear, calm, factual updates.",
        state, client,
    )

    # 4. Maintenance Scheduler Agent
    await ws_manager.broadcast_agent_thinking("orchestrator",
        "Passengers notified. Dispatching Maintenance Scheduler to book repairs.")

    segment_id = incident.location.get("segment_id", "")
    mt_result = await run_agent(
        "maintenance", MAINTENANCE_SYSTEM, MAINTENANCE_TOOLS,
        f"Schedule maintenance for this incident:\n{context}\nAffected segment: {segment_id}\nFind optimal repair window and book crew.",
        state, client,
    )

    # 5. Resolution
    await ws_manager.broadcast_agent_thinking("orchestrator",
        f"All agents have completed their tasks. Logging resolution for {incident.id}.")

    resolution_summary = (
        f"Incident {incident.id} ({incident.type} at {incident.location.get('name', 'unknown')}) resolved. "
        f"Root cause addressed, {len(incident.affected_trains)} trains rerouted, passengers notified, maintenance scheduled."
    )

    execute_tool("log_resolution", {
        "incident_id": incident.id,
        "resolution_summary": resolution_summary,
    }, state)

    await ws_manager.broadcast_resolution_complete(incident.id, resolution_summary)
    await ws_manager.broadcast_agent_complete("orchestrator", resolution_summary)

    # Reset all agents to idle after a delay
    await asyncio.sleep(3)
    for aid in ["orchestrator", "incident_response", "route_optimizer", "passenger_comms", "maintenance"]:
        state.update_agent_status(aid, AgentStatus.IDLE, "Standing by")


# ──────────────────────────────────────────────
#  Simulated flow (when no API key is provided)
# ──────────────────────────────────────────────

async def _run_simulated_flow(incident: Incident, state: NetworkState):
    """
    Runs a simulated agent flow without calling the Anthropic API.
    Uses scripted responses to demonstrate the multi-agent orchestration.
    """
    incident.status = IncidentStatus.IN_RESOLUTION
    await ws_manager.broadcast_incident_update(incident.to_dict())

    location_name = incident.location.get("name", "Unknown")
    segment_id = incident.location.get("segment_id", "")

    # Orchestrator dispatches
    state.update_agent_status("orchestrator", AgentStatus.ANALYZING,
        f"Incident {incident.id} classified {incident.severity.value.upper()}. Dispatching agents.")
    await ws_manager.broadcast_agent_thinking("orchestrator",
        f"CRITICAL incident at {location_name}. Dispatching Incident Response + Route Optimizer simultaneously.")
    await asyncio.sleep(1.5)

    # Incident Response
    state.update_agent_status("incident_response", AgentStatus.ANALYZING,
        f"Analyzing root cause of {incident.type} at {location_name}...")
    await ws_manager.broadcast_agent_thinking("incident_response",
        f"Root cause: {incident.type} at {location_name}. {len(incident.affected_trains)} trains affected. Halting trains near incident zone.")
    await asyncio.sleep(1.5)

    for tid in incident.affected_trains:
        execute_tool("halt_train", {"train_id": tid, "reason": f"{incident.type} at {location_name}"}, state)
        await ws_manager.broadcast_agent_action("incident_response", "halt_train", {"train_id": tid})
    state.update_agent_status("incident_response", AgentStatus.COMPLETE, "Root cause identified, trains halted.")
    await ws_manager.broadcast_agent_complete("incident_response", "Root cause identified, affected trains halted.")
    await asyncio.sleep(1)

    # Route Optimizer
    state.update_agent_status("route_optimizer", AgentStatus.ANALYZING,
        f"Calculating alternative routes for {len(incident.affected_trains)} trains...")
    await ws_manager.broadcast_agent_thinking("route_optimizer",
        f"Evaluating bypass routes around {location_name}. Checking track availability and minimizing total network delay.")
    await asyncio.sleep(2)

    for tid in incident.affected_trains:
        train = state.get_train(tid)
        if train:
            execute_tool("release_train", {"train_id": tid}, state)
            await ws_manager.broadcast_agent_action("route_optimizer", "assign_new_route", {"train_id": tid})
    state.update_agent_status("route_optimizer", AgentStatus.COMPLETE, "All trains rerouted via bypass corridors.")
    await ws_manager.broadcast_agent_complete("route_optimizer", "Bypass routes assigned. Trains released.")
    await asyncio.sleep(1)

    # Passenger Comms
    state.update_agent_status("passenger_comms", AgentStatus.ANALYZING,
        "Composing passenger notifications...")
    await ws_manager.broadcast_agent_thinking("passenger_comms",
        f"Drafting clear, factual updates for passengers on {len(incident.affected_trains)} affected services.")
    await asyncio.sleep(1.5)

    for tid in incident.affected_trains:
        await ws_manager.broadcast_agent_action("passenger_comms", "send_push_notification", {"affected_train_id": tid})
    await ws_manager.broadcast_agent_action("passenger_comms", "update_departure_board", {"station_id": location_name})
    state.update_agent_status("passenger_comms", AgentStatus.COMPLETE, "All passengers notified.")
    await ws_manager.broadcast_agent_complete("passenger_comms", "Push alerts and departure boards updated.")
    await asyncio.sleep(1)

    # Maintenance Scheduler
    state.update_agent_status("maintenance", AgentStatus.ANALYZING,
        f"Scheduling repair for {segment_id}...")
    await ws_manager.broadcast_agent_thinking("maintenance",
        f"Analyzing maintenance windows for {segment_id}. Overnight 01:00-04:00 slot identified as optimal.")
    await asyncio.sleep(1.5)

    await ws_manager.broadcast_agent_action("maintenance", "create_maintenance_job",
        {"segment_id": segment_id, "start_time": "01:00", "end_time": "04:00"})
    if segment_id:
        execute_tool("flag_segment_for_speed_restriction", {"segment_id": segment_id, "max_speed": 30}, state)
    state.update_agent_status("maintenance", AgentStatus.COMPLETE, "Maintenance crew booked for tonight.")
    await ws_manager.broadcast_agent_complete("maintenance", "Repair crew scheduled. Speed restriction applied.")
    await asyncio.sleep(1)

    # Resolution
    resolution_summary = (
        f"Incident {incident.id} ({incident.type} at {location_name}) resolved. "
        f"{len(incident.affected_trains)} trains rerouted, passengers notified, maintenance scheduled for tonight."
    )
    execute_tool("log_resolution", {"incident_id": incident.id, "resolution_summary": resolution_summary}, state)

    await ws_manager.broadcast_resolution_complete(incident.id, resolution_summary)
    state.update_agent_status("orchestrator", AgentStatus.COMPLETE, resolution_summary)
    await ws_manager.broadcast_agent_complete("orchestrator", resolution_summary)

    # Reset agents after delay
    await asyncio.sleep(5)
    for aid in ["orchestrator", "incident_response", "route_optimizer", "passenger_comms", "maintenance"]:
        state.update_agent_status(aid, AgentStatus.IDLE, "Standing by")
    state.update_agent_status("monitor", AgentStatus.ANALYZING, "Scanning live telemetry across 12 stations and 18 track segments...")
