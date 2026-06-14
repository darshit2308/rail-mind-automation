import { BookOpen, Cpu, Settings, Activity, Zap, Play, Terminal, HelpCircle, AlertTriangle, Route, MessageSquare, Wrench } from "lucide-react";

export function GuidePanel() {
  return (
    <div
      style={{
        padding: "24px",
        overflowY: "auto",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        background: "var(--bg-base)",
        color: "var(--ink-primary)",
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--r-3)",
          padding: "24px",
          display: "flex",
          alignItems: "center",
          gap: "18px",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "var(--r-3)",
            background: "var(--accent-dim)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <BookOpen size={28} />
        </div>
        <div>
          <h2 style={{ fontSize: "var(--text-20)", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Operations Manual & Quick Guide
          </h2>
          <p style={{ fontSize: "var(--text-13)", color: "var(--ink-muted)", marginTop: "4px" }}>
            Learn how the autonomous Multi-Agent AI system coordinates incident resolutions on the rail network.
          </p>
        </div>
      </div>

      {/* Grid Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Card 1: System Concept */}
        <div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r-3)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border-faint)", paddingBottom: "10px" }}>
            <Cpu size={18} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: "var(--text-14)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              1. What is RailMind?
            </h3>
          </div>
          <div style={{ fontSize: "var(--text-13)", lineHeight: 1.6, color: "var(--ink-secondary)", display: "flex", flexDirection: "column", gap: "10px" }}>
            <p>
              RailMind is an autonomous rail network orchestrator. It simulates train traffic and coordinates six distinct AI agents to handle live track events.
            </p>
            <p>
              When a track signal fails, a track circuit breaks down, or a train experiences a traction fault, the agents detect the anomaly, communicate, make decisions, and execute resolving actions (like halting traffic, rerouting trains, and scheduling maintenance) in real time.
            </p>
          </div>
        </div>

        {/* Card 2: Interactive Guide */}
        <div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r-3)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border-faint)", paddingBottom: "10px" }}>
            <Play size={18} style={{ color: "var(--ok)" }} />
            <h3 style={{ fontSize: "var(--text-14)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              2. Guided Test Walkthrough
            </h3>
          </div>
          <div style={{ fontSize: "var(--text-13)", lineHeight: 1.6, color: "var(--ink-secondary)", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: "var(--bg-raised)", color: "var(--ink-primary)", fontWeight: "bold", fontSize: "11px", flexShrink: 0 }}>1</span>
              <p>Go to the <strong>Live Map</strong> tab to view active trains traveling in real-time.</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: "var(--bg-raised)", color: "var(--ink-primary)", fontWeight: "bold", fontSize: "11px", flexShrink: 0 }}>2</span>
              <p>Click the red <strong>Trigger incident</strong> button (or press keyboard <code>D</code>) to inject a track failure.</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", background: "var(--bg-raised)", color: "var(--ink-primary)", fontWeight: "bold", fontSize: "11px", flexShrink: 0 }}>3</span>
              <p>Observe the right panel as the <strong>Monitor</strong> agent alerts the <strong>Orchestrator</strong>, starting the resolve cycle.</p>
            </div>
          </div>
        </div>

        {/* Card 3: Key Shortcuts */}
        <div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r-3)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border-faint)", paddingBottom: "10px" }}>
            <Terminal size={18} style={{ color: "var(--warn)" }} />
            <h3 style={{ fontSize: "var(--text-14)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              3. Interface Controls & Hotkeys
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { key: "D", desc: "Triggers the Kalyan Junction incident immediately." },
              { key: "1", desc: "Sets simulation speed to 1x (Normal rate)." },
              { key: "2", desc: "Sets simulation speed to 2x (Accelerated rate)." },
              { key: "5", desc: "Sets simulation speed to 5x (Maximum rate)." },
            ].map((k) => (
              <div key={k.key} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "var(--text-13)" }}>
                <kbd
                  style={{
                    display: "inline-block",
                    padding: "3px 8px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#ffffff",
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--r-1)",
                    minWidth: "24px",
                    textAlign: "center",
                  }}
                >
                  {k.key}
                </kbd>
                <span style={{ color: "var(--ink-secondary)" }}>{k.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: Map Legend */}
        <div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r-3)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border-faint)", paddingBottom: "10px" }}>
            <Activity size={18} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: "var(--text-14)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              4. Map & Telemetry Indicators
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "var(--text-13)", color: "var(--ink-secondary)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: "11px", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "8px" }}>Train Status</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--ok)" }} />
                    On Time
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--warn)" }} />
                    Delayed
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent)" }} />
                    Rerouting
                  </span>
                </div>
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: "11px", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "8px" }}>Track Health</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ height: "4px", width: "16px", borderRadius: "2px", background: "var(--ok)" }} />
                    Clear Track
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ height: "4px", width: "16px", borderRadius: "2px", background: "var(--warn)" }} />
                    Restricted
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ height: "4px", width: "16px", borderRadius: "2px", background: "var(--crit)" }} />
                    Blocked
                  </span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: "11px", color: "var(--ink-muted)", borderTop: "1px solid var(--border-faint)", paddingTop: "8px", marginTop: "4px" }}>
              * Station circles grow and pulse depending on platform capacity load.
            </p>
          </div>
        </div>
      </div>

      {/* Agents Roles Manual */}
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--r-3)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border-faint)", paddingBottom: "12px" }}>
          <Cpu size={18} style={{ color: "var(--accent)" }} />
          <h3 style={{ fontSize: "var(--text-14)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            5. Agent Directory & Specializations
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {[
            {
              name: "Master Orchestrator",
              role: "Classifies incoming incidents, coordinates agent tasks, and completes the case resolution log.",
              icon: Cpu,
              color: "var(--accent)",
            },
            {
              name: "Network Monitor",
              role: "Continuously scans sensor telemetry circuits every 8 seconds, identifying discrepancies and raising anomalies.",
              icon: Activity,
              color: "var(--ok)",
            },
            {
              name: "Incident Response",
              role: "Performs root-cause analysis, triggers emergency track stop limits, and manages emergency safety overrides.",
              icon: AlertTriangle,
              color: "var(--crit)",
            },
            {
              name: "Route Optimizer",
              role: "Reviews network topology maps and reroutes approaching trains to keep the corridors flowing.",
              icon: Route,
              color: "var(--purple)",
            },
            {
              name: "Passenger Comms",
              role: "Drafts and emits station announcements, text notifications, and updates live departures.",
              icon: MessageSquare,
              color: "var(--warn)",
            },
            {
              name: "Maintenance Scheduler",
              role: "Coordinates and dispatches ground technicians, books repairs, and manages speed restriction zones.",
              icon: Wrench,
              color: "var(--high)",
            },
          ].map((ag) => {
            const AgIcon = ag.icon;
            return (
              <div
                key={ag.name}
                style={{
                  background: "rgba(0, 0, 0, 0.15)",
                  border: "1px solid var(--border-faint)",
                  borderRadius: "var(--r-2)",
                  padding: "16px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "var(--r-1)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: ag.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <AgIcon size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: "var(--text-13)", fontWeight: 700, color: "var(--ink-primary)" }}>{ag.name}</h4>
                  <p style={{ fontSize: "var(--text-12)", color: "var(--ink-muted)", marginTop: "4px", lineHeight: 1.4 }}>
                    {ag.role}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Configuration & LLM Mode */}
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--r-3)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border-faint)", paddingBottom: "12px" }}>
          <Settings size={18} style={{ color: "var(--purple)" }} />
          <h3 style={{ fontSize: "var(--text-14)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            6. Agent Modes & LLM Orchestration
          </h3>
        </div>
        <div style={{ fontSize: "var(--text-13)", lineHeight: 1.6, color: "var(--ink-secondary)", display: "flex", flexDirection: "column", gap: "12px" }}>
          <p>
            RailMind operates in two reasoning configurations:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "4px" }}>
            <div style={{ padding: "14px", borderRadius: "var(--r-2)", border: "1px solid var(--border-faint)", background: "rgba(0, 0, 0, 0.15)" }}>
              <h4 style={{ fontWeight: 700, color: "var(--ink-primary)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--warn)" }} />
                Scripted Fallback Mode
              </h4>
              <p style={{ fontSize: "var(--text-12)", color: "var(--ink-muted)", lineHeight: 1.4 }}>
                Active when <code>ANTHROPIC_API_KEY</code> is not set in <code>.env</code>. The agents process incident tasks using a deterministic step-by-step logic.
              </p>
            </div>
            <div style={{ padding: "14px", borderRadius: "var(--r-2)", border: "1px solid var(--border-faint)", background: "rgba(0, 0, 0, 0.15)" }}>
              <h4 style={{ fontWeight: 700, color: "var(--ok)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--ok)" }} />
                Live AI Orchestration Mode
              </h4>
              <p style={{ fontSize: "var(--text-12)", color: "var(--ink-muted)", lineHeight: 1.4 }}>
                Active when a valid key is provided. The Master Orchestrator calls Claude-3.5-Sonnet to dynamically formulate plans, call tools, resolve alerts, and draft summaries.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
