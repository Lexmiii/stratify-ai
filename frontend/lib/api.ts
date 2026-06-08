const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function sendMessage(message: string, sessionId: string) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  if (!response.ok) throw new Error("Failed to reach Lexi");
  return response.json();
}

export async function getSession(sessionId: string) {
  const response = await fetch(`${API_URL}/api/session/${sessionId}`);
  if (!response.ok) return { history: [] };
  return response.json();
}

export function generateSessionId() {
  return `lexi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}