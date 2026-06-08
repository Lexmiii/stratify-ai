"use client";
import { motion } from "framer-motion";

interface ChatHistory {
  session_id: string;
  goal: string;
  timestamp: string;
}

interface SidebarProps {
  history: ChatHistory[];
  currentMode: string;
  onModeChange: (mode: string) => void;
  onNewChat: () => void;
}

const modes = ["Planner", "Tutor", "Friend", "Interview coach"];

export default function Sidebar({ history, currentMode, onModeChange, onNewChat }: SidebarProps) {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        width: 210,
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255,255,255,0.8)",
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        height: "100vh",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#2d1b69", letterSpacing: "-0.5px" }}>Lexi</span>
        <button
          onClick={onNewChat}
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #e879f9, #818cf8)",
            border: "none",
            color: "white",
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 300,
          }}
        >+</button>
      </div>

      {/* Recent chats */}
      <p style={{ fontSize: 10, color: "#9d8ec4", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", paddingLeft: 8, marginBottom: 4 }}>
        Recent
      </p>

      {history.length === 0 ? (
        <p style={{ fontSize: 12, color: "#c4b5e8", paddingLeft: 8, fontStyle: "italic" }}>No chats yet</p>
      ) : (
        history.slice(0, 6).map((item, i) => (
          <div key={i} style={{
            padding: "8px 10px",
            borderRadius: 10,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(232,121,249,0.1)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <p style={{ fontSize: 12, color: "#4c3a8a", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {item.goal}
            </p>
            <p style={{ fontSize: 10, color: "#b8aad4", marginTop: 2 }}>{item.timestamp}</p>
          </div>
        ))
      )}

      {/* Modes */}
      <div style={{ marginTop: "auto" }}>
        <p style={{ fontSize: 10, color: "#9d8ec4", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", paddingLeft: 8, marginBottom: 6 }}>
          Modes
        </p>
        {modes.map((mode) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 10,
              border: "none",
              textAlign: "left",
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
              background: currentMode === mode
                ? "linear-gradient(135deg, rgba(232,121,249,0.2), rgba(129,140,248,0.2))"
                : "transparent",
              color: currentMode === mode ? "#4c3a8a" : "#7c6aad",
              fontWeight: currentMode === mode ? 600 : 400,
              marginBottom: 2,
            }}
          >
            {mode}
          </button>
        ))}
      </div>
    </motion.div>
  );
}