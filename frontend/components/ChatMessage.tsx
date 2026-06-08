"use client";
import { motion } from "framer-motion";

interface WeekPlan {
  week: number;
  focus: string;
  tasks: string[];
}

interface Roadmap {
  recommendation?: string;
  why?: string;
  tradeoffs?: string[];
  roadmap?: WeekPlan[];
  milestones?: string[];
}

interface Message {
  role: "user" | "lexi";
  content: string;
  subproblems?: string[];
  roadmap?: Roadmap;
  messageType?: string;
}

export default function ChatMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}
      >
        <div style={{
          maxWidth: "70%",
          padding: "12px 16px",
          borderRadius: "20px 20px 4px 20px",
          background: "linear-gradient(135deg, #e879f9, #818cf8)",
          color: "white",
          fontSize: 14,
          lineHeight: 1.6,
          boxShadow: "0 4px 20px rgba(232,121,249,0.3)",
        }}>
          {message.content}
        </div>
      </motion.div>
    );
  }

  const isEmotionalOrCasual = !message.roadmap?.roadmap || message.roadmap.roadmap.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{ marginBottom: 16 }}
    >
      {/* Lexi header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #e879f9, #818cf8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "white",
          fontWeight: 600,
          flexShrink: 0,
        }}>L</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#4c3a8a" }}>Lexi</span>
      </div>

      {/* Response card */}
      <div style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(20px)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.9)",
        padding: "14px 16px",
        marginLeft: 36,
      }}>

        {/* Main message — always show this */}
        <p style={{
          fontSize: 14,
          color: "#4c3a8a",
          lineHeight: 1.7,
          marginBottom: isEmotionalOrCasual ? 0 : 12,
          whiteSpace: "pre-wrap",
        }}>
          {message.content}
        </p>

        {/* Only show below sections for PLANNING responses */}
        {!isEmotionalOrCasual && (
          <>
            {/* Subproblems */}
            {message.subproblems && message.subproblems.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{
                  fontSize: 11,
                  color: "#9d8ec4",
                  fontWeight: 600,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Breaking it down
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {message.subproblems.map((s, i) => (
                    <span key={i} style={{
                      padding: "4px 10px",
                      borderRadius: 12,
                      background: "rgba(232,121,249,0.1)",
                      border: "1px solid rgba(232,121,249,0.25)",
                      fontSize: 12,
                      color: "#7c3aed",
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Why */}
            {message.roadmap?.why && (
              <div style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(232,121,249,0.06)",
                border: "1px solid rgba(232,121,249,0.15)",
                marginBottom: 14,
              }}>
                <p style={{ fontSize: 13, color: "#7c6aad", lineHeight: 1.6, margin: 0 }}>
                  {message.roadmap.why}
                </p>
              </div>
            )}

            {/* Roadmap weeks */}
            {message.roadmap?.roadmap && message.roadmap.roadmap.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{
                  fontSize: 11,
                  color: "#9d8ec4",
                  fontWeight: 600,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Your roadmap
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {message.roadmap.roadmap.map((week: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "linear-gradient(135deg, rgba(232,121,249,0.08), rgba(129,140,248,0.08))",
                        border: "1px solid rgba(232,121,249,0.2)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{
                          padding: "2px 10px",
                          borderRadius: 10,
                          background: "linear-gradient(135deg, #e879f9, #818cf8)",
                          color: "white",
                          fontSize: 11,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}>
                          {week.week ? `Week ${week.week}` : `Step ${i + 1}`}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#4c3a8a" }}>
                          {week.focus}
                        </span>
                      </div>
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {week.tasks?.map((task: string, ti: number) => (
                          <li key={ti} style={{ fontSize: 12, color: "#7c6aad", lineHeight: 1.7 }}>
                            {task}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Milestones */}
            {message.roadmap?.milestones && message.roadmap.milestones.length > 0 && (
              <div>
                <p style={{
                  fontSize: 11,
                  color: "#9d8ec4",
                  fontWeight: 600,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Milestones
                </p>
                {message.roadmap.milestones.map((m: string, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #e879f9, #818cf8)",
                      flexShrink: 0,
                      marginTop: 5,
                    }} />
                    <span style={{ fontSize: 12, color: "#7c6aad", lineHeight: 1.6 }}>{m}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tradeoffs */}
            {message.roadmap?.tradeoffs && message.roadmap.tradeoffs.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{
                  fontSize: 11,
                  color: "#9d8ec4",
                  fontWeight: 600,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  Things to keep in mind
                </p>
                {message.roadmap.tradeoffs.map((t: string, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#b8aad4" }}>•</span>
                    <span style={{ fontSize: 12, color: "#9d8ec4", lineHeight: 1.6 }}>{t}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}