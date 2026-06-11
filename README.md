# RailMind — Smart Rail Control Room

**The Brain Behind Every Train**

RailMind is a multi-agent AI control room that autonomously monitors, decides, and resolves railway incidents on a simulated Indian rail network. Five specialized agents — Monitor, Incident Response, Route Optimizer, Passenger Comms, and Maintenance Scheduler — are coordinated by a Master Orchestrator and powered by Claude with tool use.

## Architecture

```
React Control Room UI  ←→  Socket.IO  ←→  FastAPI Backend
     (Leaflet map)              │              ├── Simulation engine
     (Agent panel)              │              ├── Monitor agent loop
     (Incident feed)             │              └── Orchestrator + 5 agents
     (Analytics)                └── REST API (demo trigger, speed, state)
```

## Quick Start

### 1. Backend (Python)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Optional: set ANTHROPIC_API_KEY in .env for live Claude agents
python -m uvicorn main:sio_asgi_app --reload --port 8000
```

### 2. Frontend (React + Vite)

```bash
# from project root
npm install   # or: bun install
npm run dev   # or: bun dev
```

Open **http://localhost:5173** (or the port Vite prints).

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | Claude API key for live agent tool-use loops |
| `MAX_AGENT_ITERATIONS` | `5` | Guard against stuck agent loops |
| `VITE_API_URL` | `http://localhost:8000` | Backend URL for the frontend |

## Demo

1. Start both backend and frontend.
2. Open the **Live Map** view — trains move in real time.
3. Click **Trigger Demo Incident** (or press `D`) for the golden-path signal failure at Kalyan Junction.
4. Watch the Monitor detect the anomaly, then the Orchestrator dispatch all five agents.
5. Toggle **Analytics** for delay charts and resolution metrics.
6. Use **1× / 2× / 5×** speed controls (keyboard `1`, `2`, `5`).

## Agents

| Agent | Role |
|-------|------|
| **Master Orchestrator** | Classifies incidents, sequences agent dispatch, logs resolution |
| **Network Monitor** | Scans telemetry every 8s, detects anomalies, raises alerts |
| **Incident Response** | Root-cause analysis, halt/release trains, escalation |
| **Route Optimizer** | Reroutes trains via bypass corridors |
| **Passenger Comms** | Station announcements, push notifications, departure boards |
| **Maintenance Scheduler** | Books repair windows, applies speed restrictions |

## Tech Stack

- **Frontend:** React 19, Vite, TanStack Start, Tailwind CSS, Leaflet, Recharts, Framer Motion, Socket.IO client
- **Backend:** Python FastAPI, python-socketio, Anthropic SDK, Pydantic, asyncio
- **AI:** Claude (`claude-sonnet-4-20250514`) with function calling / tool use

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/network/state` | GET | Trains, tracks, stations |
| `/api/network/topology` | GET | Static network graph |
| `/api/incidents` | GET | Active and recent incidents |
| `/api/agents/status` | GET | All agent states |
| `/api/incidents/trigger` | POST | Golden-path demo incident |
| `/api/simulation/speed` | POST | Set speed (1×, 2×, 5×) |
| `/api/analytics/summary` | GET | Delay stats and health score |

**WebSocket events:** `train:update`, `incident:new`, `incident:update`, `agent:thinking`, `agent:action`, `agent:complete`, `network:alert`, `resolution:complete`

## Network

12 stations across the Mumbai–Pune–Gujarat corridor, 18 track segments, 8 demo trains.

Built for the Agentic AI & Autonomous Systems hackathon track.
