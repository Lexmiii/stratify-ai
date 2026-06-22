"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import LexiOrb from "@/components/LexiOrb";
import { Mic, MicOff, AudioLines, Menu } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import Sidebar from "@/components/Sidebar";
import { useVoice } from "@/hooks/useVoice";
import {
  sendMessage, generateSessionId, listChats,
  getMessageHistory, pinChat, deleteChat,
} from "@/lib/api";

type OrbState = "idle" | "thinking" | "listening" | "speaking";

interface Message {
  role: "user" | "lexi";
  content: string;
  messageType?: "casual" | "emotional" | "planning";
  subproblems?: string[];
  roadmap?: any;
  timestamp?: string;
}

interface ChatMeta {
  session_id: string;
  title: string;
  pinned?: boolean;
  created_at?: string;
}

const quickActions = ["Make a plan", "Surprise me", "Find a place", "Teach me something"];

function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function SendIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

const modeColors: Record<string, string> = {
  "Planner": "#7c3aed",
  "Tutor": "#0ea5e9",
  "Friend": "#10b981",
  "Interview coach": "#f59e0b",
};

// Hook: tracks whether viewport is mobile width. SSR-safe (starts false, updates on mount).
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

export default function ChatPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [currentMode, setCurrentMode] = useState("Planner");
  const [chats, setChats] = useState<ChatMeta[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sessionId = useRef(generateSessionId());
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const currentModeRef = useRef("Planner");

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { currentModeRef.current = currentMode; }, [currentMode]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { setActiveSessionId(sessionId.current); refreshChatList(); }, []);

  const refreshChatList = async () => {
    try {
      const data = await listChats();
      setChats(Array.isArray(data) ? data : []);
    } catch {}
  };

  const handleSend = useCallback(async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || orbState === "thinking") return;

    setInput("");
    setShowWelcome(false);
    setMessages(prev => [...prev, { role: "user", content: messageText, timestamp: getTimestamp() }]);
    setOrbState("thinking");

    try {
      const data = await sendMessage(
        messageText,
        sessionId.current,
        messagesRef.current,
        currentModeRef.current
      );
      const isPlanning = data.subproblems?.length > 0;
      const responseText = (data.direct_response || data.roadmap?.recommendation || data.analysis || "").trim();

      const lexiMessage: Message = {
        role: "lexi",
        content: responseText || "No response received. Please try again.",
        messageType: isPlanning ? "planning" : "casual",
        subproblems: data.subproblems,
        roadmap: data.roadmap,
        timestamp: getTimestamp(),
      };

      setMessages(prev => [...prev, lexiMessage]);
      refreshChatList();
      setOrbState("speaking");
      setTimeout(() => setOrbState("idle"), 3000);
    } catch {
      setMessages(prev => [...prev, {
        role: "lexi",
        content: "Sorry, I had trouble connecting. Please try again!",
        messageType: "casual",
        timestamp: getTimestamp(),
      }]);
      setOrbState("idle");
    }
  }, [input, orbState]);

  const { voiceMode, toggleMic } = useVoice({
    onTranscript: (text) => {
      setInput(text);
      setTimeout(() => handleSend(text), 100);
    },
    onSpeakEnd: () => {},
  });

  const handleNewChat = () => {
    setMessages([]);
    setShowWelcome(true);
    setOrbState("idle");
    sessionId.current = generateSessionId();
    setActiveSessionId(sessionId.current);
    if (isMobile) setSidebarOpen(false);
  };

  const handleSelectChat = async (selectedSessionId: string) => {
    if (selectedSessionId === activeSessionId && messages.length > 0) return;
    setOrbState("thinking");
    if (isMobile) setSidebarOpen(false);
    try {
      const data = await getMessageHistory(selectedSessionId);
      const loadedMessages: Message[] = [];
      if (data?.messages) {
        for (const m of data.messages) {
          loadedMessages.push({
            role: "user", content: m.user,
            timestamp: m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : ""
          });
          loadedMessages.push({
            role: "lexi", content: m.lexi, messageType: "casual",
            timestamp: m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : ""
          });
        }
      }
      sessionId.current = selectedSessionId;
      setActiveSessionId(selectedSessionId);
      setMessages(loadedMessages);
      setShowWelcome(loadedMessages.length === 0);
    } catch {} finally {
      setOrbState("idle");
    }
  };

  const handlePinChat = async (id: string) => {
    try { await pinChat(id); refreshChatList(); } catch {}
  };

  const handleDeleteChat = async (id: string) => {
    try {
      await deleteChat(id);
      if (id === activeSessionId) handleNewChat();
      refreshChatList();
    } catch {}
  };

  const modeColor = modeColors[currentMode] || "#7c3aed";

  const sidebarElement = (
    <Sidebar
      chats={chats}
      activeSessionId={activeSessionId}
      currentMode={currentMode}
      onModeChange={(m) => { setCurrentMode(m); if (isMobile) setSidebarOpen(false); }}
      onNewChat={handleNewChat}
      onSelectChat={handleSelectChat}
      onPinChat={handlePinChat}
      onDeleteChat={handleDeleteChat}
      onClose={() => setSidebarOpen(false)}
      isMobile={isMobile}
    />
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", maxWidth: "100vw" }}>

      {/* DESKTOP: sidebar always rendered inline */}
      {!isMobile && sidebarElement}

      {/* MOBILE: sidebar as drawer, only in DOM when open, plus backdrop */}
      {isMobile && (
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                style={{
                  position: "fixed", inset: 0,
                  background: "rgba(0,0,0,0.35)",
                  zIndex: 40,
                }}
              />
              <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50 }}>
                {sidebarElement}
              </div>
            </>
          )}
        </AnimatePresence>
      )}

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minWidth: 0,
        maxWidth: "100%",
      }}>

        {/* Top bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile ? "12px 16px" : "16px 24px",
          background: "rgba(255,255,255,0.4)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          flexShrink: 0,
          gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 8, minWidth: 0 }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#7c3aed", padding: 4, flexShrink: 0,
                  display: "flex", alignItems: "center",
                }}
              >
                <Menu size={20} />
              </button>
            )}
            <span style={{ fontSize: 15, fontWeight: 700, color: "#2d1b69", flexShrink: 0 }}>
              Lexi
            </span>
            <motion.div
              animate={{ scale: orbState === "thinking" ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.8, repeat: orbState === "thinking" ? Infinity : 0 }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: "#86efac", flexShrink: 0 }}
            />
            {!isMobile && (
              <span style={{ fontSize: 13, color: "#9d8ec4", whiteSpace: "nowrap" }}>
                {orbState === "thinking" ? "Lexi is thinking..." :
                 orbState === "speaking" ? "Lexi is responding..." : "Lexi is ready"}
              </span>
            )}
            {isMobile && (
              <span style={{ fontSize: 12, color: "#9d8ec4", whiteSpace: "nowrap" }}>
                {orbState === "thinking" ? "Thinking..." :
                 orbState === "speaking" ? "Responding..." : "Ready"}
              </span>
            )}
          </div>

          <span style={{
            padding: isMobile ? "4px 10px" : "4px 14px",
            borderRadius: 20,
            fontSize: isMobile ? 11 : 12,
            fontWeight: 600,
            color: modeColor,
            background: `${modeColor}18`,
            border: `1px solid ${modeColor}44`,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}>
            {currentMode}
          </span>
        </div>

        {/* Chat area */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: isMobile ? "16px 16px" : "24px",
        }}>
          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  paddingTop: isMobile ? 24 : 40,
                }}
              >
                <div style={{ transform: isMobile ? "scale(0.6)" : "scale(1)" }}>
                  <LexiOrb state={orbState} />
                </div>
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 700, color: "#2d1b69",
                    marginTop: isMobile ? 4 : 20, marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  Hi, I'm{" "}
                  <span style={{
                    background: "linear-gradient(135deg, #e879f9, #818cf8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                    Lexi
                  </span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  style={{ fontSize: isMobile ? 13 : 15, color: "#9d8ec4", marginBottom: 24, textAlign: "center" }}
                >
                  Your personal AI. Ask me anything.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  style={{
                    display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
                    padding: "0 8px", maxWidth: "100%",
                  }}
                >
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(action)}
                      style={{
                        padding: isMobile ? "7px 12px" : "8px 16px",
                        borderRadius: 20,
                        fontSize: isMobile ? 12 : 13,
                        color: "#7c3aed",
                        cursor: "pointer",
                        backdropFilter: "blur(10px)",
                        transition: "all 0.2s",
                        background: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(232,121,249,0.3)",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(232,121,249,0.15)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.7)")}
                    >
                      {action}
                    </button>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showWelcome && (
            <div style={{ maxWidth: 750, margin: "0 auto" }}>
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}
              {orbState === "thinking" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}
                >
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    fontSize: 12,
                    color: "white",
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #e879f9, #818cf8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>L</div>
                  <div style={{
                    background: "rgba(255,255,255,0.75)",
                    borderRadius: 16,
                    padding: "12px 16px",
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}>
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #e879f9, #818cf8)",
                        }}
                      />
                    ))}
                    <span style={{ fontSize: 13, color: "#9d8ec4", marginLeft: 4 }}>
                      Lexi is thinking...
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar — sticky bottom, safe-area aware */}
        <div style={{
          padding: isMobile
            ? "12px 16px calc(12px + env(safe-area-inset-bottom))"
            : "16px 24px",
          background: "rgba(255,255,255,0.4)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.6)",
          flexShrink: 0,
        }}>
          <div style={{
            maxWidth: 750,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 6 : 10,
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.9)",
            borderRadius: 28,
            padding: isMobile ? "6px 6px 6px 14px" : "8px 8px 8px 20px",
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder={isMobile ? "Message Lexi..." : "Ask Lexi anything..."}
              disabled={orbState === "thinking"}
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                background: "transparent",
                fontSize: 14,
                color: "#4c3a8a",
                outline: "none",
              }}
            />

            <button
              onClick={() => handleSend()}
              disabled={orbState === "thinking"}
              style={{
                width: isMobile ? 34 : 38,
                height: isMobile ? 34 : 38,
                borderRadius: "50%",
                cursor: "pointer",
                background: "rgba(232,121,249,0.15)",
                border: "1px solid rgba(232,121,249,0.3)",
                color: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <SendIcon size={isMobile ? 14 : 16} />
            </button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleMic}
              style={{
                width: isMobile ? 36 : 40,
                height: isMobile ? 36 : 40,
                borderRadius: "50%",
                cursor: "pointer",
                border: "none",
                background: voiceMode === "listening"
                  ? "linear-gradient(135deg, #34d399, #10b981)"
                  : "rgba(255,255,255,0.6)",
                color: voiceMode === "listening" ? "white" : "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: voiceMode === "listening" ? "0 0 16px rgba(52,211,153,0.5)" : "none",
                transition: "all 0.2s",
              }}
            >
              {voiceMode === "listening" ? <MicOff size={isMobile ? 16 : 18} /> : <Mic size={isMobile ? 16 : 18} />}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push(`/voice?mode=${encodeURIComponent(currentMode)}`)}
              style={{
                width: isMobile ? 40 : 44,
                height: isMobile ? 40 : 44,
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, #e879f9, #818cf8)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 4px 15px rgba(232,121,249,0.3)",
              }}
            >
              <AudioLines size={isMobile ? 18 : 20} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}