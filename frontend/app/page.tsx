"use client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import LexiOrb from "@/components/LexiOrb";

export default function Home() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(160deg, #f5f0ff 0%, #fce7f3 50%, #ede9fe 100%)",
      padding: "40px 20px",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
      >
        <LexiOrb state="idle" />

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ fontSize: 48, fontWeight: 700, color: "#2d1b69", marginTop: 24, marginBottom: 12, letterSpacing: "-1px" }}
        >
          Meet{" "}
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
          style={{ fontSize: 18, color: "#9d8ec4", maxWidth: 480, lineHeight: 1.6, marginBottom: 12 }}
        >
          Your personal AI assistant. Ask anything — career, cooking, travel, life advice. Lexi thinks, plans, and remembers.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ fontSize: 14, color: "#c4b5e8", marginBottom: 36 }}
        >
          Powered by multi-step reasoning · Web search · Voice input
        </motion.p>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/chat")}
          style={{
            padding: "16px 40px",
            borderRadius: 30,
            background: "linear-gradient(135deg, #e879f9, #818cf8)",
            border: "none",
            color: "white",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 8px 30px rgba(232,121,249,0.4)",
            letterSpacing: "0.3px",
          }}
        >
          Start talking to Lexi →
        </motion.button>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{ display: "flex", gap: 32, marginTop: 48 }}
        >
          {[
            { label: "Multi-step reasoning", icon: "🧠" },
            { label: "Remembers you", icon: "💾" },
            { label: "Voice enabled", icon: "🎤" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              <span style={{ fontSize: 12, color: "#9d8ec4" }}>{item.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}