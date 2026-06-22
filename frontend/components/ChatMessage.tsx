"use client";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

const theme = {
  primary: "#7c3aed",
  secondary: "#818cf8",
  pink: "#e879f9",
  text: "#4c3a8a",
  muted: "#9d8ec4",
  soft: "#7c6aad",
  border: "rgba(232,121,249,0.25)",
  cardBg: "rgba(255,255,255,0.75)",
};

interface RoadmapStep {
  label?: string;
  phase?: string;
  week?: number;
  day?: number;
  focus: string;
  tasks: string[];
}

interface Roadmap {
  recommendation?: string;
  why?: string;
  tradeoffs?: string[];
  roadmap?: RoadmapStep[];
  milestones?: string[];
}

interface Message {
  role: "user" | "lexi";
  content: string;
  messageType?: "casual" | "emotional" | "planning";
  subproblems?: string[];
  roadmap?: Roadmap;
  timestamp?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        padding: "3px 10px",
        borderRadius: 8,
        border: `1px solid ${theme.border}`,
        background: "rgba(255,255,255,0.6)",
        fontSize: 11,
        color: theme.muted,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SpeakerButton({
  text,
  isSpeaking,
  onSpeak,
  onStop,
}: {
  text: string;
  isSpeaking: boolean;
  onSpeak: (text: string) => void;
  onStop: () => void;
}) {
  return (
    <button
      onClick={() => (isSpeaking ? onStop() : onSpeak(text))}
      title={isSpeaking ? "Stop reading" : "Read aloud"}
      style={{
        position: "absolute",
        top: 10,
        right: 70,
        width: 26,
        height: 26,
        borderRadius: "50%",
        border: `1px solid ${theme.border}`,
        background: isSpeaking ? theme.primary : "rgba(255,255,255,0.6)",
        color: isSpeaking ? "white" : theme.muted,
        fontSize: 12,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
      }}
    >
      {isSpeaking ? "⏸" : "🔊"}
    </button>
  );
}

function StepLabel({ step, index }: { step: RoadmapStep; index: number }) {
  if (step.label) return <>{step.label}</>;
  if (step.phase) return <>{step.phase}</>;
  if (step.week) return <>Week {step.week}</>;
  if (step.day) return <>Day {step.day}</>;
  return <>Step {index + 1}</>;
}

interface ChatMessageProps {
  message: Message;
  isSpeaking?: boolean;
  onSpeak?: (text: string) => void;
  onStopSpeaking?: () => void;
}

export default function ChatMessage({ message, isSpeaking = false, onSpeak, onStopSpeaking }: ChatMessageProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const isPlanning = message.messageType === "planning" ||
    (message.roadmap?.roadmap && message.roadmap.roadmap.length > 0);

  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}
      >
        <div>
          <div style={{
            maxWidth: "85%",
            padding: "12px 16px",
            borderRadius: "20px 20px 4px 20px",
            background: `linear-gradient(135deg, ${theme.pink}, ${theme.secondary})`,
            color: "white",
            fontSize: 14,
            lineHeight: 1.6,
            boxShadow: "0 4px 20px rgba(232,121,249,0.3)",
            marginLeft: "auto",
          }}>
            {message.content}
          </div>
          {message.timestamp && (
            <p style={{ fontSize: 10, color: theme.muted, textAlign: "right", marginTop: 4 }}>
              {message.timestamp}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{ marginBottom: 20 }}
    >
      {/* Lexi avatar header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <motion.div
          animate={{ boxShadow: ["0 0 0px rgba(232,121,249,0.3)", "0 0 12px rgba(232,121,249,0.6)", "0 0 0px rgba(232,121,249,0.3)"] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${theme.pink}, ${theme.secondary})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "white",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >L</motion.div>
        <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>Lexi</span>
        {message.timestamp && (
          <span style={{ fontSize: 10, color: theme.muted, marginLeft: 4 }}>{message.timestamp}</span>
        )}
      </div>

      {/* Main card */}
      <div style={{
        background: theme.cardBg,
        backdropFilter: "blur(20px)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.9)",
        padding: "16px 18px",
        marginLeft: 40,
        position: "relative",
        maxWidth: "90%",
      }}>
        <CopyButton text={message.content} />
        {onSpeak && onStopSpeaking && (
          <SpeakerButton
            text={message.content}
            isSpeaking={isSpeaking}
            onSpeak={onSpeak}
            onStop={onStopSpeaking}
          />
        )}

        {/* Main content with markdown */}
        <div style={{
          fontSize: 15,
          color: theme.text,
          lineHeight: 1.8,
          marginBottom: isPlanning ? 14 : 0,
          paddingRight: 50,
        }}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p style={{ margin: "0 0 10px", color: theme.text, fontSize: 15, lineHeight: 1.8 }}>{children}</p>,
              strong: ({ children }) => <strong style={{ color: theme.primary, fontWeight: 600 }}>{children}</strong>,
              ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: "8px 0", color: theme.soft }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: "8px 0", color: theme.soft }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: 4, fontSize: 14, lineHeight: 1.7 }}>{children}</li>,
              code: ({ children }) => (
                <code style={{
                  background: "rgba(124,58,237,0.08)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 13,
                  color: theme.primary,
                  fontFamily: "monospace",
                }}>{children}</code>
              ),
              h1: ({ children }) => <h1 style={{ fontSize: 18, fontWeight: 600, color: theme.text, margin: "12px 0 6px" }}>{children}</h1>,
              h2: ({ children }) => <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, margin: "10px 0 6px" }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, color: theme.text, margin: "8px 0 4px" }}>{children}</h3>,
              blockquote: ({ children }) => (
                <blockquote style={{
                  borderLeft: `3px solid ${theme.pink}`,
                  paddingLeft: 12,
                  margin: "8px 0",
                  color: theme.muted,
                  fontStyle: "italic",
                }}>{children}</blockquote>
              ),
              a: ({ children, ...props }) => (
          <a
             {...props}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: theme.primary,
              textDecoration: "underline",
      fontWeight: 500,
    }}
  >
    {children}
  </a>
          ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Planning sections */}
        {isPlanning && (
          <>
            {/* Collapsible reasoning */}
            {message.subproblems && message.subproblems.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 0",
                    color: theme.muted,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <motion.span
                    animate={{ rotate: showReasoning ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >▼</motion.span>
                  How I broke this down
                </button>
                <AnimatePresence>
                  {showReasoning && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 8 }}>
                        {message.subproblems.map((s, i) => (
                          <span key={i} style={{
                            padding: "4px 10px",
                            borderRadius: 12,
                            background: "rgba(232,121,249,0.1)",
                            border: `1px solid ${theme.border}`,
                            fontSize: 12,
                            color: theme.primary,
                          }}>{s}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Recommendation card */}
            {message.roadmap?.recommendation && (
              <div style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: `linear-gradient(135deg, rgba(232,121,249,0.08), rgba(129,140,248,0.08))`,
                border: `1px solid ${theme.border}`,
                marginBottom: 14,
              }}>
                <p style={{ fontSize: 13, color: theme.soft, lineHeight: 1.7, margin: 0 }}>
                  {message.roadmap.recommendation}
                </p>
              </div>
            )}

            {/* Roadmap steps */}
            {message.roadmap?.roadmap && message.roadmap.roadmap.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{
                  fontSize: 11,
                  color: theme.muted,
                  fontWeight: 600,
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>Your roadmap</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {message.roadmap.roadmap.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      whileHover={{ scale: 1.01 }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "linear-gradient(135deg, rgba(232,121,249,0.06), rgba(129,140,248,0.06))",
                        border: `1px solid ${theme.border}`,
                        cursor: "default",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: 10,
                          background: `linear-gradient(135deg, ${theme.pink}, ${theme.secondary})`,
                          color: "white",
                          fontSize: 11,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}>
                          <StepLabel step={step} index={i} />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>
                          {step.focus}
                        </span>
                      </div>
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {step.tasks?.map((task, ti) => (
                          <li key={ti} style={{ fontSize: 13, color: theme.soft, lineHeight: 1.7 }}>
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
              <div style={{ marginBottom: 12 }}>
                <p style={{
                  fontSize: 11,
                  color: theme.muted,
                  fontWeight: 600,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>Milestones</p>
                {message.roadmap.milestones.map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${theme.pink}, ${theme.secondary})`,
                      flexShrink: 0,
                      marginTop: 6,
                    }} />
                    <span style={{ fontSize: 13, color: theme.soft, lineHeight: 1.6 }}>{m}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tradeoffs */}
            {message.roadmap?.tradeoffs && message.roadmap.tradeoffs.length > 0 && (
              <div>
                <p style={{
                  fontSize: 11,
                  color: theme.muted,
                  fontWeight: 600,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>Things to keep in mind</p>
                {message.roadmap.tradeoffs.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: theme.muted }}>•</span>
                    <span style={{ fontSize: 13, color: theme.muted, lineHeight: 1.6 }}>{t}</span>
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