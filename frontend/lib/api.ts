const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface ChatMessage {
  role: "user" | "lexi";
  content: string;
}

export async function sendMessage(
  message: string,
  sessionId: string,
  history: ChatMessage[] = [],
  mode: string = "Planner"
) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      mode,
      history: history.map(m => ({
        role: m.role === "lexi" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });
  if (!response.ok) throw new Error("Failed to reach Lexi");
  return response.json();
}

export async function getSession(sessionId: string) {
  const response = await fetch(`${API_URL}/api/session/${sessionId}`);
  if (!response.ok) return { history: [] };
  return response.json();
}

export async function getMessageHistory(sessionId: string) {
  const response = await fetch(`${API_URL}/api/messages/${sessionId}`);
  if (!response.ok) return { messages: [] };
  return response.json();
}

export async function listChats() {
  const response = await fetch(`${API_URL}/api/chats`);
  if (!response.ok) return [];
  return response.json();
}

export async function pinChat(sessionId: string) {
  const response = await fetch(`${API_URL}/api/chats/${sessionId}/pin`, {
    method: "POST",
  });
  if (!response.ok) return null;
  return response.json();
}

export async function deleteChat(sessionId: string) {
  const response = await fetch(`${API_URL}/api/chats/${sessionId}`, {
    method: "DELETE",
  });
  if (!response.ok) return null;
  return response.json();
}

export function generateSessionId() {
  return `lexi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}