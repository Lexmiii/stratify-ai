"use client";
import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, AudioLines, Settings, X } from "lucide-react";
import LexiOrb from "@/components/LexiOrb";
import { useVoice } from "@/hooks/useVoice";
import { sendMessage, generateSessionId } from "@/lib/api";

const modeColors: Record<string, string> = {
  "Planner": "#7c3aed",
  "Tutor": "#0ea5e9",
  "Friend": "#10b981",
  "Interview coach": "#f59e0b",
};

function buildSpokenResponse(data: any): string {
  if (data.roadmap && data.roadmap.roadmap && Array.isArray(data.roadmap.roadmap) && data.roadmap.roadmap.length > 0) {
    const r = data.roadmap;
    const parts: string[] = [];
    if (r.recommendation) parts.push(r.recommendation);
    r.roadmap.forEach((step: any, i: number) => {
      const label = step.phase || step.label || `Step ${i + 1}`;
      const focus = step.focus || "";
      const tasks = Array.isArray(step.tasks) ? step.tasks.slice(0, 2).join(", ") : "";
      if (focus) parts.push(`${label}: ${focus}. ${tasks}`);
    });
    if (r.milestones && Array.isArray(r.milestones) && r.milestones.length > 0) {
      parts.push("Key milestones: " + r.milestones.slice(0, 3).join(", "));
    }
    return parts.join(". ");
  }
  return (data.direct_response || data.analysis || "").trim();
}

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

export default function VoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const mode = searchParams.get("mode") || "Planner";
  const modeColor = modeColors[mode] || "#7c3aed";

  const [sessionId] = useState(generateSessionId());
  const [isReady, setIsReady] = useState(false);
  const [lastLexiMessage, setLastLexiMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const messagesRef = useRef<{ role: string; content: string }[]>([]);
  const isProcessingRef = useRef(false);
  const speakRef = useRef<((text: string) => void) | null>(null);
  const startConversationRef = useRef<(() => void) | null>(null);
  const modeRef = useRef(mode);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  const handleTranscript = useCallback(async (text: string) => {
    if (isProcessingRef.current) return;
    if (!text.trim()) return;
    isProcessingRef.current = true;

    messagesRef.current = [...messagesRef.current, { role: "user", content: text }];

    try {
      const data = await sendMessage(
        text,
        sessionId,
        messagesRef.current as any,
        modeRef.current
      );

      const response = buildSpokenResponse(data);

      if (response) {
        setLastLexiMessage(response);
        messagesRef.current = [...messagesRef.current, { role: "lexi", content: response }];
        if (speakRef.current) speakRef.current(response);
      } else {
        setTimeout(() => {
          if (startConversationRef.current) startConversationRef.current();
        }, 400);
      }
    } catch (err) {
      console.error("Send error:", err);
      setTimeout(() => {
        if (startConversationRef.current) startConversationRef.current();
      }, 2000);
    } finally {
      isProcessingRef.current = false;
    }
  }, [sessionId]);

  const {
    voiceMode, selectedVoice, setSelectedVoice, voiceOptions,
    speak, previewVoice, toggleMic, interrupt, startConversation, endConversation,
  } = useVoice({
    onTranscript: handleTranscript,
    onSpeakEnd: () => {},
  });

  useEffect(() => { speakRef.current = speak; }, [speak]);
  useEffect(() => { startConversationRef.current = startConversation; }, [startConversation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
      startConversation();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleEnd = () => {
    endConversation();
    router.push("/chat");
  };

  const statusText = () => {
    switch (voiceMode) {
      case "listening": return "Listening...";
      case "speaking": return "Lexi is speaking";
      case "thinking": return "Thinking...";
      default: return isReady ? "Tap to talk" : "Starting...";
    }
  };

  const orbState = voiceMode === "listening" ? "listening" :
    voiceMode === "speaking" ? "speaking" :
    voiceMode === "thinking" ? "thinking" : "idle";

  const glowColor = voiceMode === "listening"
    ? "rgba(52,211,153,0.4)"
    : voiceMode === "speaking"
    ? "rgba(232,121,249,0.55)"
    : voiceMode === "thinking"
    ? "rgba(129,140,248,0.45)"
    : "rgba(232,121,249,0.18)";

  // Orb scale: desktop stays 2.4 (unchanged), mobile shrinks to fit
  const orbScale = isMobile ? 1.3 : 2.4;
  const glowSize = isMobile ? 380 : 700;

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      background: "linear-gradient(160deg, #f5f0ff 0%, #fce7f3 50%, #ede9fe 100%)",
      padding: isMobile
        ? "16px 16px calc(24px + env(safe-area-inset-bottom))"
        : "24px 20px 48px",
      position: "relative",
      overflow: "hidden",
      maxWidth: "100vw",
    }}>

      {/* Ambient glow */}
      <motion.div
        animate={{ opacity: [0.4, 0.75, 0.4], scale: [1, 1.12, 1] }}
        transition={{ duration: voiceMode === "speaking" ? 1.0 : 4, repeat: Infinity }}
        style={{
          position: "absolute",
          top: "42%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: glowSize, height: glowSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(70px)",
          pointerEvents: "none",
          zIndex: 0,
          transition: "background 1s ease",
        }}
      />

      {/* Top bar */}
      <div style={{
        width: "100%", maxWidth: 560,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        zIndex: 10, flexWrap: isMobile ? "wrap" : "nowrap", gap: 8,
      }}>
        <span style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: "#2d1b69" }}>Lexi</span>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10 }}>

          <div style={{
            padding: isMobile ? "4px 10px" : "5px 12px", borderRadius: 20,
            fontSize: isMobile ? 11 : 12, fontWeight: 600,
            color: modeColor,
            background: `${modeColor}18`,
            border: `1px solid ${modeColor}44`,
            whiteSpace: "nowrap",
          }}>
            {mode}
          </div>

          {!isMobile && (
            <div style={{
              padding: "6px 12px", borderRadius: 20,
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(232,121,249,0.3)",
              fontSize: 12, color: "#7c3aed", fontWeight: 500,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <AudioLines size={13} />
              Voice
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setShowSettings(!showSettings)}
            style={{
              width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, borderRadius: "50%",
              background: showSettings ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.6)",
              border: "1px solid rgba(232,121,249,0.3)",
              color: "#7c3aed", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Settings size={isMobile ? 14 : 16} />
          </motion.button>
        </div>
      </div>

      {/* Settings drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              top: isMobile ? 64 : 72,
              right: isMobile ? 12 : 20,
              left: isMobile ? 12 : "auto",
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(20px)",
              borderRadius: 16,
              padding: "16px 18px",
              border: "1px solid rgba(232,121,249,0.3)",
              zIndex: 100,
              minWidth: isMobile ? "auto" : 260,
              boxShadow: "0 8px 32px rgba(124,58,237,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#2d1b69" }}>Choose Voice</span>
              <button onClick={() => setShowSettings(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9d8ec4" }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {voiceOptions.map((voice) => (
                <div key={voice.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setSelectedVoice(voice); setShowSettings(false); }}
                    style={{
                      flex: 1, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                      border: selectedVoice.id === voice.id ? "2px solid #e879f9" : "1px solid rgba(232,121,249,0.3)",
                      background: selectedVoice.id === voice.id
                        ? "linear-gradient(135deg, rgba(232,121,249,0.15), rgba(129,140,248,0.15))"
                        : "rgba(255,255,255,0.5)",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: selectedVoice.id === voice.id ? 600 : 400, color: "#2d1b69" }}>
                      {voice.name}
                    </span>
                    <span style={{ fontSize: 11, color: "#9d8ec4", marginLeft: 6 }}>
                      {voice.description}
                    </span>
                  </motion.button>
                  <button
                    onClick={() => previewVoice(voice)}
                    style={{
                      fontSize: 11, color: "#7c3aed",
                      background: "rgba(124,58,237,0.08)",
                      border: "1px solid rgba(124,58,237,0.2)",
                      borderRadius: 8, padding: "6px 10px",
                      cursor: "pointer", fontWeight: 500,
                    }}
                  >
                    Preview
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CENTER — orb + status */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center",
        flex: 1, justifyContent: "center",
        zIndex: 10, gap: 0,
        width: "100%",
        maxWidth: 400,
      }}>
        <motion.div
          animate={{
            scale: voiceMode === "speaking" ? [1, 1.06, 1.02, 1] :
                   voiceMode === "listening" ? [1, 1.04, 1] :
                   voiceMode === "thinking" ? [1, 1.02, 1] :
                   [1, 1.01, 1],
          }}
          transition={{
            duration: voiceMode === "speaking" ? 0.65 :
                      voiceMode === "thinking" ? 1.2 : 3,
            repeat: Infinity,
          }}
          style={{
            transform: `scale(${orbScale})`,
            marginBottom: isMobile ? 48 : 80,
            filter: voiceMode === "listening"
              ? "drop-shadow(0 0 35px rgba(52,211,153,0.7))"
              : voiceMode === "speaking"
              ? "drop-shadow(0 0 45px rgba(232,121,249,0.8))"
              : voiceMode === "thinking"
              ? "drop-shadow(0 0 30px rgba(129,140,248,0.6))"
              : "drop-shadow(0 0 20px rgba(232,121,249,0.3))",
          }}
        >
          <LexiOrb state={orbState as any} />
        </motion.div>

        <motion.p
          key={statusText()}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            fontSize: isMobile ? 20 : 26, fontWeight: 700,
            color: "#2d1b69", marginBottom: 12,
            textAlign: "center",
          }}
        >
          {statusText()}
        </motion.p>

        <AnimatePresence>
          {lastLexiMessage && voiceMode === "speaking" && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 0.75, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                fontSize: isMobile ? 13 : 14, color: "#7c6aad",
                maxWidth: isMobile ? 280 : 320, lineHeight: 1.7,
                textAlign: "center",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                padding: "0 8px",
              }}
            >
              "{lastLexiMessage}"
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM controls */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: isMobile ? 10 : 14,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 28 : 36 }}>
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.93 }}
            onClick={voiceMode === "speaking" ? interrupt : toggleMic}
            style={{
              width: isMobile ? 54 : 62, height: isMobile ? 54 : 62, borderRadius: "50%",
              border: "none", cursor: "pointer",
              background: voiceMode === "listening"
                ? "linear-gradient(135deg, #34d399, #10b981)"
                : "rgba(255,255,255,0.8)",
              color: voiceMode === "listening" ? "white" : "#7c3aed",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: voiceMode === "listening"
                ? "0 4px 24px rgba(52,211,153,0.55)"
                : "0 2px 12px rgba(0,0,0,0.08)",
              transition: "all 0.25s",
            }}
          >
            {voiceMode === "listening" ? <MicOff size={isMobile ? 20 : 24} /> : <Mic size={isMobile ? 20 : 24} />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.93 }}
            onClick={handleEnd}
            style={{
              width: isMobile ? 64 : 74, height: isMobile ? 64 : 74, borderRadius: "50%",
              border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 28px rgba(239,68,68,0.45)",
            }}
          >
            <PhoneOff size={isMobile ? 24 : 28} />
          </motion.button>
        </div>

        <motion.p
          key={voiceMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ fontSize: isMobile ? 11 : 12, color: "#c4b5e8", textAlign: "center", padding: "0 16px" }}
        >
          {voiceMode === "speaking"
            ? "Tap mic to interrupt"
            : voiceMode === "listening"
            ? "Speak now..."
            : voiceMode === "thinking"
            ? "Processing your request..."
            : "Conversation continues automatically"}
        </motion.p>
      </div>
    </div>
  );
}