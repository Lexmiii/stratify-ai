"use client";
import { motion } from "framer-motion";
import { ListTodo, GraduationCap, MessageCircle, Target, Plus, Star, Trash2, X } from "lucide-react";

interface ChatMeta {
  session_id: string;
  title: string;
  pinned?: boolean;
  created_at?: string;
}

interface SidebarProps {
  chats: ChatMeta[];
  activeSessionId: string;
  currentMode: string;
  onModeChange: (mode: string) => void;
  onNewChat: () => void;
  onSelectChat: (sessionId: string) => void;
  onPinChat: (sessionId: string) => void;
  onDeleteChat: (sessionId: string) => void;
  onClose?: () => void; // mobile only — closes the drawer
  isMobile?: boolean;
}

const modes = [
  { label: "Planner", color: "#7c3aed", icon: ListTodo, desc: "Goals → plans" },
  { label: "Tutor", color: "#0ea5e9", icon: GraduationCap, desc: "Build understanding" },
  { label: "Friend", color: "#10b981", icon: MessageCircle, desc: "Just talk" },
  { label: "Interview coach", color: "#f59e0b", icon: Target, desc: "Get interview-ready" },
];

export default function Sidebar({
  chats, activeSessionId, currentMode,
  onModeChange, onNewChat, onSelectChat, onPinChat, onDeleteChat,
  onClose, isMobile,
}: SidebarProps) {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        width: isMobile ? "min(85vw, 300px)" : 240,
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255,255,255,0.8)",
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        height: "100vh",
        flexShrink: 0,
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#2d1b69", letterSpacing: "-0.5px" }}>Lexi</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onNewChat}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #e879f9, #818cf8)",
              border: "none", color: "white",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Plus size={18} />
          </button>
          {isMobile && onClose && (
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(124,58,237,0.1)",
                border: "none", color: "#7c3aed",
                cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Recent chats */}
      <p style={{
        fontSize: 10, color: "#9d8ec4", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.5px",
        paddingLeft: 8, marginBottom: 4,
      }}>Recent</p>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
        {chats.length === 0 ? (
          <div style={{ padding: "16px 8px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#c4b5e8", fontStyle: "italic", marginBottom: 4 }}>No chats yet</p>
            <p style={{ fontSize: 11, color: "#d8c8f0" }}>Start your first conversation</p>
          </div>
        ) : (
          chats.map((item) => (
            <div
              key={item.session_id}
              onClick={() => onSelectChat(item.session_id)}
              style={{
                padding: "9px 8px 9px 10px",
                borderRadius: 10,
                cursor: "pointer",
                transition: "background 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                background: activeSessionId === item.session_id
                  ? "rgba(232,121,249,0.15)"
                  : "transparent",
              }}
              onMouseEnter={e => {
                if (activeSessionId !== item.session_id)
                  e.currentTarget.style.background = "rgba(232,121,249,0.08)";
              }}
              onMouseLeave={e => {
                if (activeSessionId !== item.session_id)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                {item.pinned && <Star size={11} fill="#e879f9" color="#e879f9" style={{ flexShrink: 0 }} />}
                <p style={{
                  fontSize: 12, color: "#4c3a8a", fontWeight: 500,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {item.title || "New chat"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onPinChat(item.session_id); }}
                  title={item.pinned ? "Unpin" : "Pin"}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: item.pinned ? "#e879f9" : "#c4b5e8",
                    padding: "4px", minWidth: 24, minHeight: 24,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Star size={13} fill={item.pinned ? "#e879f9" : "none"} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteChat(item.session_id); }}
                  title="Delete"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#c4b5e8",
                    padding: "4px", minWidth: 24, minHeight: 24,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modes */}
      <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid rgba(232,121,249,0.15)" }}>
        <p style={{
          fontSize: 10, color: "#9d8ec4", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.5px",
          paddingLeft: 8, marginBottom: 6,
        }}>Modes</p>
        {modes.map((mode) => {
          const Icon = mode.icon;
          const active = currentMode === mode.label;
          return (
            <button
              key={mode.label}
              onClick={() => onModeChange(mode.label)}
              style={{
                width: "100%",
                padding: "9px 10px",
                borderRadius: 10,
                border: active ? `1px solid ${mode.color}33` : "1px solid transparent",
                textAlign: "left",
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
                background: active ? `${mode.color}12` : "transparent",
                color: active ? mode.color : "#7c6aad",
                fontWeight: active ? 600 : 400,
                marginBottom: 2,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                <span>{mode.label}</span>
                {active && (
                  <span style={{ fontSize: 10, color: mode.color, opacity: 0.7, fontWeight: 400 }}>
                    {mode.desc}
                  </span>
                )}
              </div>
              {active && (
                <span style={{
                  marginLeft: "auto", width: 6, height: 6,
                  borderRadius: "50%", background: mode.color, flexShrink: 0,
                }} />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}