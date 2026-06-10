"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LexiOrb from "@/components/LexiOrb";
import ChatMessage from "@/components/ChatMessage";
import Sidebar from "@/components/Sidebar";
import { sendMessage, generateSessionId } from "@/lib/api";

type OrbState = "idle" | "thinking" | "listening" | "speaking";

interface Message {
  role: "user" | "lexi";
  content: string;
  messageType?: "casual" | "emotional" | "planning";
  subproblems?: string[];
  roadmap?: any;
  timestamp?: string;
}

const quickActions = ["Make a plan", "Surprise me", "Find a place", "Teach me something"];

function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [currentMode, setCurrentMode] = useState("Planner");
  const [history, setHistory] = useState<any[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const sessionId = useRef(generateSessionId());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || orbState === "thinking") return;

    setInput("");
    setShowWelcome(false);
    setMessages(prev => [...prev, {
      role: "user",
      content: messageText,
      timestamp: getTimestamp(),
    }]);
    setOrbState("thinking");

    try {
      const data = await sendMessage(messageText, sessionId.current);

      const isPlanning = data.subproblems?.length > 0;

      const lexiMessage: Message = {
        role: "lexi",
        content: data.direct_response || data.roadmap?.recommendation || data.analysis || "Here's what I found for you!",
        subproblems: data.subproblems,
        roadmap: data.roadmap,
        messageType: isPlanning ? "planning" : "casual",
        timestamp: getTimestamp(),
      };

      setMessages(prev => [...prev, lexiMessage]);
      setHistory(prev => [...prev, {
        session_id: sessionId.current,
        goal: messageText,
        timestamp: getTimestamp(),
      }]);
      setOrbState("speaking");
      setTimeout(() => setOrbState("idle"), 3000);

    } catch (error) {
      setMessages(prev => [...prev, {
        role: "lexi",
        content: "Sorry, I had trouble connecting. Please try again!",
        messageType: "casual",
        timestamp: getTimestamp(),
      }]);
      setOrbState("idle");
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setShowWelcome(true);
    setOrbState("idle");
    sessionId.current = generateSessionId();
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        history={history}
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        onNewChat={handleNewChat}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          background: "rgba(255,255,255,0.4)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <motion.div
              animate={{ scale: orbState === "thinking" ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.8, repeat: orbState === "thinking" ? Infinity : 0 }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: "#86efac" }}
            />
            <span style={{ fontSize: 13, color: "#9d8ec4" }}>
              {orbState === "thinking" ? "Lexi is thinking..." :
               orbState === "speaking" ? "Lexi is responding..." : "Lexi is ready"}
            </span>
          </div>
          <span style={{
            padding: "4px 14px",
            borderRadius: 20,
            background: "linear-gradient(135deg, rgba(232,121,249,0.15), rgba(129,140,248,0.15))",
            border: "1px solid rgba(232,121,249,0.3)",
            fontSize: 12,
            color: "#7c3aed",
            fontWeight: 500,
          }}>{currentMode}</span>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40 }}
              >
                <LexiOrb state={orbState} />
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  style={{ fontSize: 28, fontWeight: 700, color: "#2d1b69", marginTop: 20, marginBottom: 8 }}
                >
                  Hi, I'm{" "}
                  <span style={{
                    background: "linear-gradient(135deg, #e879f9, #818cf8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>Lexi</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  style={{ fontSize: 15, color: "#9d8ec4", marginBottom: 28 }}
                >
                  Your personal AI. Ask me anything.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}
                >
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(action)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 20,
                        background: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(232,121,249,0.3)",
                        fontSize: 13,
                        color: "#7c3aed",
                        cursor: "pointer",
                        backdropFilter: "blur(10px)",
                        transition: "all 0.2s",
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
                    background: "linear-gradient(135deg, #e879f9, #818cf8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "white",
                    fontWeight: 700,
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

        {/* Input bar */}
        <div style={{
          padding: "16px 24px",
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
            gap: 10,
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.9)",
            borderRadius: 28,
            padding: "8px 8px 8px 20px",
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Ask Lexi anything..."
              disabled={orbState === "thinking"}
              style={{
                flex: 1,
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
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(232,121,249,0.15)",
                border: "1px solid rgba(232,121,249,0.3)",
                color: "#7c3aed",
                fontSize: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >→</button>
            <button
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #e879f9, #818cf8)",
                border: "none",
                color: "white",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >♪</button>
          </div>
        </div>
      </div>
    </div>
  );
}