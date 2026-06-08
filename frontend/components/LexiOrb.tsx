"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type OrbState = "idle" | "thinking" | "listening" | "speaking";

export default function LexiOrb({ state }: { state: OrbState }) {
  const animation =
    state === "listening"
      ? {
          y: [0, -5, 0],
          scaleX: [1, 1.05, 0.98, 1],
          scaleY: [1, 0.95, 1.02, 1],
        }
      : state === "thinking"
      ? {
          y: [0, -4, 0],
          rotate: [0, 2, -2, 0],
          scale: [1, 1.03, 1],
        }
      : state === "speaking"
      ? {
          y: [0, -6, 0],
          scale: [1, 1.08, 1],
        }
      : {
          y: [0, -4, 0],
          scaleX: [1, 1.015, 1],
          scaleY: [1, 0.985, 1],
        };

  return (
    <div
      style={{
        position: "relative",
        width: 240,
        height: 240,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Glow behind orb */}
      <motion.div
        animate={{
          opacity: [0.25, 0.6, 0.25],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,120,220,0.35), rgba(120,220,255,0.2), transparent)",
          filter: "blur(24px)",
        }}
      />

      {/* Orb Image */}
      <motion.div
        animate={animation}
        transition={{
          duration: state === "speaking" ? 0.8 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "relative",
          zIndex: 2,
        }}
      >
        <Image
          src="/orb.png"
          alt="Lexi Orb"
          width={180}
          height={180}
          priority
        />
      </motion.div>

      {/* Speaking / Listening Bars */}
      {(state === "thinking" ||
        state === "listening" ||
        state === "speaking") && (
        <div
          style={{
            position: "absolute",
            bottom: 75,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 4,
            zIndex: 5,
          }}
        >
          {[8, 14, 10, 18, 12, 15, 9].map((h, i) => (
            <motion.div
              key={i}
              animate={{
                scaleY: [1, 2.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.08,
              }}
              style={{
                width: 3,
                height: h,
                borderRadius: 999,
                background: "white",
                transformOrigin: "center",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}