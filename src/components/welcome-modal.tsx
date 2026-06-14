import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Play, ShieldAlert, Map, Zap, Cpu } from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Welcome to RailMind Control Room",
    subtitle: "Autonomous Multi-Agent Railway Operations",
    icon: Cpu,
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <p>
          RailMind is an autonomous operations center overseeing a simulated Indian rail corridor.
          The network is governed by <strong>five specialized AI agents</strong> coordinated by a <strong>Master Orchestrator</strong>.
        </p>
        <p>
          When an anomaly is detected, these agents collaborate in real time using <strong>tool-use (function calling)</strong> to isolate, reroute, and resolve incidents automatically.
        </p>
      </div>
    ),
  },
  {
    title: "1. The Live Map & Telemetry",
    subtitle: "Real-Time Fleet & Segment Status",
    icon: Map,
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <p>
          Observe the active trains traveling between <strong>12 major stations</strong>.
        </p>
        <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <li>
            <strong>Train Status</strong>: Green indicators mean on-time, orange shows delays, and blue indicates actively rerouted trains.
          </li>
          <li>
            <strong>Overlay Stats</strong>: Check the bottom-left panel for live On-Time rate, Active Incident count, and Average Delays.
          </li>
          <li>
            <strong>Station Occupancy</strong>: Pulsing circles around stations represent platform congestion levels.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "2. Triggering & Testing Anomaly Loops",
    subtitle: "Observe Incident Injection",
    icon: Zap,
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <p>
          To test the intelligence of the agents, click the red <strong>"Trigger incident"</strong> button in the top header.
        </p>
        <p>
          This immediately simulates a severe corridor failure (e.g. points jam, signal box short-circuit, or locomotive breakdown at Kalyan Junction).
        </p>
        <p style={{ color: "var(--warn)" }}>
          <em>Pro-Tip: You can also adjust the simulation speed (1×, 2×, 5×) to watch resolutions accelerate!</em>
        </p>
      </div>
    ),
  },
  {
    title: "3. Watching the AI Cooperate",
    subtitle: "Full Incident Resolution Flow",
    icon: ShieldAlert,
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <p>
          Once an incident triggers, look at the sidebar:
        </p>
        <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <li>
            <strong>AI Agents panel</strong>: Green/Yellow badges show which agent is currently <code>thinking</code>, <code>acting</code>, or has completed its task.
          </li>
          <li>
            <strong>Incident Feed</strong>: Streams the raw thinking log and tool invocations of each agent (e.g. halts, routes, departure boards, and dispatching crews).
          </li>
          <li>
            <strong>Resolution Dialog</strong>: A comprehensive timeline analysis is displayed once the orchestrator verifies the incident is resolved.
          </li>
        </ul>
      </div>
    ),
  },
];

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [step, setStep] = useState(0);

  // Reset step to 0 when reopened
  useEffect(() => {
    if (isOpen) {
      setStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentData = STEPS[step];
  const IconComponent = currentData.icon;
  const isLastStep = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleComplete = () => {
    localStorage.setItem("railmind_onboarding_shown", "true");
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "16px",
      }}
      onClick={handleComplete}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--r-3)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div style={{ height: "4px", background: "var(--accent)" }} />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "20px 24px 10px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "var(--r-2)",
                background: "var(--accent-dim)",
                color: "var(--accent)",
                flexShrink: 0,
              }}
            >
              <IconComponent size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "var(--text-18)", fontWeight: 700, color: "var(--ink-primary)" }}>
                {currentData.title}
              </h2>
              <p style={{ fontSize: "var(--text-11)", fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>
                {currentData.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={handleComplete}
            style={{
              padding: "4px",
              borderRadius: "var(--r-1)",
              color: "var(--ink-muted)",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-muted)")}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body content */}
        <div
          style={{
            padding: "16px 24px 24px 24px",
            fontSize: "var(--text-13)",
            lineHeight: 1.6,
            color: "var(--ink-secondary)",
            flex: 1,
            minHeight: "160px",
            borderBottom: "1px solid var(--border-faint)",
          }}
        >
          {currentData.content}
        </div>

        {/* Footer controls */}
        <div
          style={{
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(0, 0, 0, 0.15)",
          }}
        >
          {/* Progress indicators */}
          <div style={{ display: "flex", gap: "6px" }}>
            {STEPS.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setStep(idx)}
                style={{
                  width: idx === step ? "24px" : "6px",
                  height: "6px",
                  borderRadius: "3px",
                  background: idx === step ? "var(--accent)" : "var(--border-strong)",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                }}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            {step > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "var(--r-2)",
                  border: "1px solid var(--border-default)",
                  fontSize: "var(--text-12)",
                  fontWeight: 600,
                  color: "var(--ink-primary)",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)")}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "var(--r-2)",
                fontSize: "var(--text-12)",
                fontWeight: 700,
                color: "#ffffff",
                backgroundColor: isLastStep ? "var(--ok)" : "var(--accent)",
                boxShadow: isLastStep
                  ? "0 4px 12px rgba(34, 197, 94, 0.2)"
                  : "0 4px 12px rgba(59, 130, 246, 0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isLastStep ? "#15803D" : "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isLastStep ? "var(--ok)" : "var(--accent)";
              }}
            >
              <span>{isLastStep ? "Get Started" : "Continue"}</span>
              {isLastStep ? <Play size={12} fill="white" /> : <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
