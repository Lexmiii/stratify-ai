"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { VOICE_OPTIONS } from "@/hooks/useVoice";
import type { VoiceMode } from "@/hooks/useVoice";

interface VoiceOverlayProps {
  isOpen: boolean;
  voiceMode: VoiceMode;
  selectedVoice: typeof VOICE_OPTIONS[0];
  onSelectVoice: (voice: typeof VOICE_OPTIONS[0]) => void;
  onPreviewVoice: (voice: typeof VOICE_OPTIONS[0]) => void;
  onEnd: () => void;
  onInterrupt: () => void;
  onToggleMic: () => void;
}

function MicIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}

function PhoneOffIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/>
      <path d="M14.5 2.5a10 10 0 0 0-10 10"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function PlayIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}

export default function VoiceOverlay({
  isOpen, voiceMode, selectedVoice, onSelectVoice,
  onPreviewVoice, onEnd, onInterrupt, onToggleMic,
}: VoiceOverlayProps) {
  const [hoveredVoice, setHoveredVoice] = useState<string | null>(null);

  const getOrbGradient = () => {
    if (voiceMode === "listening") return "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95) 0%, rgba(134,239,172,0.8) 25%, rgba(52,211,153,0.6) 55%, rgba(16,185,129,0.4) 100%)";
    if (voiceMode === "speaking") return "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95) 0%, rgba(249,168,212,0.8) 20%, rgba(192,132,252,0.6) 45%, rgba(96,165,250,0.5) 75%, rgba(34,211,238,0.4) 100%)";
    return "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95) 0%, rgba(249,168,212,0.7) 25%, rgba(192,132,252,0.5) 55%, rgba(96,165,250,0.4) 100%)";
  };

  const getOrbShadow = () => {
    if (voiceMode === "listening") return "0 0 80px rgba(52,211,153,0.5), 0 0 160px rgba(52,211,153,0.2), inset 0 0 40px rgba(255,255,255,0.5)";
    if (voiceMode === "speaking") return "0 0 80px rgba(192,132,252,0.5), 0 0 160px rgba(249,168,212,0.3), inset 0 0 40px rgba(255,255,255,0.5)";
    return "0 0 60px rgba(192,132,252,0.3), 0 0 120px rgba(249,168,212,0.15), inset 0 0 40px rgba(255,255,255,0.4)";
  };

  const getStatusText = () => {
    if (voiceMode === "listening") return "Listening...";
    if (voiceMode === "speaking") return "Lexi is speaking";
    return "Tap mic to speak";
  };

  const getSubText = () => {
    if (voiceMode === "speaking") return "Say anything to interrupt";
    if (voiceMode === "listening") return "Speak naturally";
    return "Or just listen";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "linear-gradient(160deg, #f5f0ff 0%, #fce7f3 50%, #ede9fe 100%)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "space-between",
            padding: "0 20px 40px",
          }}
        >
          {/* Top bar */}
          <div style={{
            width: "100%", display: "flex", justifyContent: "space-between",
            alignItems: "center", padding: "20px 4px",
          }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#2d1b69" }}>Lexi</span>
            <div style={{
              padding: "6px 16px", borderRadius: 20,
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(232,121,249,0.3)",
              fontSize: 13, color: "#7c3aed", fontWeight: 500,
            }}>
              Voice Mode
            </div>
          </div>

          {/* Center section — orb + status */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>

            {/* Outer glow */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: voiceMode === "speaking" ? 0.8 : 3, repeat: Infinity }}
                style={{
                  position: "absolute", width: 240, height: 240, borderRadius: "50%",
                  background: voiceMode === "listening"
                    ? "radial-gradient(circle, rgba(52,211,153,0.2) 0%, transparent 70%)"
                    : "radial-gradient(circle, rgba(232,121,249,0.2) 0%, transparent 70%)",
                  filter: "blur(10px)",
                }}
              />

              {/* Main orb */}
              <motion.div
                animate={{ scale: voiceMode === "speaking" ? [1, 1.06, 1.02, 1] : voiceMode === "listening" ? [1, 1.04, 1] : [1, 1.02, 1] }}
                transition={{ duration: voiceMode === "speaking" ? 0.7 : 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 180, height: 180, borderRadius: "50%",
                  background: getOrbGradient(),
                  boxShadow: getOrbShadow(),
                  position: "relative", overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {/* Glass highlight */}
                <div style={{
                  position: "absolute", top: "8%", left: "12%",
                  width: "48%", height: "40%", borderRadius: "50%",
                  background: "radial-gradient(ellipse, rgba(255,255,255,0.9) 0%, transparent 100%)",
                }} />
                <div style={{
                  position: "absolute", bottom: "15%", right: "12%",
                  width: "18%", height: "14%", borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,255,255,0.7) 0%, transparent 100%)",
                }} />

                {/* Wave bars */}
                {(voiceMode === "speaking" || voiceMode === "listening") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, position: "relative", zIndex: 2 }}>
                    {[6, 14, 9, 20, 11, 16, 7].map((h, i) => (
                      <motion.div key={i}
                        animate={{ scaleY: [1, 2.2, 1], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: voiceMode === "speaking" ? 0.4 : 0.6, repeat: Infinity, delay: i * 0.08 }}
                        style={{ width: 4, height: h, borderRadius: 2, background: "rgba(255,255,255,0.9)", transformOrigin: "center" }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Status */}
            <div style={{ textAlign: "center", marginTop: 28 }}>
              <motion.p key={voiceMode} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: 20, fontWeight: 600, color: "#2d1b69", marginBottom: 6 }}>
                {getStatusText()}
              </motion.p>
              <p style={{ fontSize: 13, color: "#9d8ec4" }}>{getSubText()}</p>
            </div>

            {/* Interrupt button */}
            <AnimatePresence>
              {voiceMode === "speaking" && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  onClick={onInterrupt}
                  style={{
                    marginTop: 20, padding: "10px 24px", borderRadius: 24,
                    background: "rgba(255,255,255,0.7)", border: "1px solid rgba(232,121,249,0.4)",
                    color: "#7c3aed", fontSize: 14, fontWeight: 500, cursor: "pointer",
                  }}
                >
                  Interrupt
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom section — voice picker + controls */}
          <div style={{ width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>

            {/* Voice persona picker */}
            <div style={{ width: "100%" }}>
              <p style={{ fontSize: 11, color: "#9d8ec4", textAlign: "center", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                Choose Voice
              </p>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, justifyContent: "center", flexWrap: "wrap" }}>
                {VOICE_OPTIONS.map((voice) => (
                  <div
                    key={voice.id}
                    onMouseEnter={() => setHoveredVoice(voice.id)}
                    onMouseLeave={() => setHoveredVoice(null)}
                    style={{ position: "relative" }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onSelectVoice(voice)}
                      style={{
                        padding: "10px 14px", borderRadius: 14, cursor: "pointer",
                        border: selectedVoice.id === voice.id ? "2px solid #e879f9" : "1px solid rgba(232,121,249,0.3)",
                        background: selectedVoice.id === voice.id
                          ? "linear-gradient(135deg, rgba(232,121,249,0.15), rgba(129,140,248,0.15))"
                          : "rgba(255,255,255,0.6)",
                        textAlign: "left", minWidth: 90,
                      }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 600, color: selectedVoice.id === voice.id ? "#7c3aed" : "#4c3a8a", margin: 0 }}>
                        {voice.name}
                      </p>
                      <p style={{ fontSize: 11, color: "#9d8ec4", margin: "2px 0 0" }}>
                        {voice.description}
                      </p>
                    </motion.button>

                    {/* Preview button on hover */}
                    <AnimatePresence>
                      {hoveredVoice === voice.id && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={(e) => { e.stopPropagation(); onPreviewVoice(voice); }}
                          style={{
                            position: "absolute", top: -8, right: -8,
                            width: 24, height: 24, borderRadius: "50%",
                            background: "linear-gradient(135deg, #e879f9, #818cf8)",
                            border: "none", cursor: "pointer", color: "white",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <PlayIcon size={10} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* Mic + End call buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>

              {/* Mic button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleMic}
                style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: voiceMode === "listening"
                    ? "linear-gradient(135deg, #34d399, #10b981)"
                    : "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(232,121,249,0.3)",
                  color: voiceMode === "listening" ? "white" : "#7c3aed",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: voiceMode === "listening" ? "0 4px 20px rgba(52,211,153,0.4)" : "none",
                }}
              >
                <MicIcon size={22} />
              </motion.button>

              {/* End call */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onEnd}
                style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  border: "none", color: "white", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 8px 24px rgba(239,68,68,0.4)",
                }}
              >
                <PhoneOffIcon size={24} />
              </motion.button>
            </div>

            <p style={{ fontSize: 12, color: "#c4b5e8" }}>Hover a voice to preview it</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}