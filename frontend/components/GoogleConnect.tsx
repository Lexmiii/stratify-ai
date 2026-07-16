"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;
const USER_ID = "lexi_user_main";

export default function GoogleConnect() {
  const [status, setStatus] = useState<{
    connected: boolean;
    email: string | null;
  }>({ connected: false, email: null });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch(`${API}/auth/google/status?session_id=${USER_ID}`)
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected") === "true") {
      const email = params.get("email") || "";
      setStatus({ connected: true, email });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    const res = await fetch(`${API}/auth/google/login?session_id=${USER_ID}`);
    const { auth_url } = await res.json();
    window.location.href = auth_url;
  };

  const handleDisconnect = async () => {
    await fetch(`${API}/auth/google/disconnect?session_id=${USER_ID}`, {
      method: "DELETE",
    });
    setStatus({ connected: false, email: null });
    setShowModal(false);
  };

  if (loading) return null;

  const initial = status.email ? status.email[0].toUpperCase() : "L";

  return (
    <>
      {/* bottom profile row — Claude style */}
      <div
        onClick={() => setShowModal(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 8px",
          borderRadius: 10,
          cursor: "pointer",
          marginTop: 4,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.06)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        {/* profile circle */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: status.connected
            ? "linear-gradient(135deg, #7c3aed, #4c1d95)"
            : "rgba(124,58,237,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: status.connected ? "white" : "#7c3aed",
            lineHeight: 1,
          }}>
            {initial}
          </span>
          {/* green dot if connected */}
          {status.connected && (
            <div style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#10b981",
              border: "2px solid rgba(255,255,255,0.9)",
            }} />
          )}
        </div>

        {/* email or connect text */}
        <div style={{ minWidth: 0, flex: 1 }}>
          {status.connected ? (
            <div style={{
              fontSize: 12,
              color: "#4c3a8a",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {status.email}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#9d8ec4" }}>
              Connect Google
            </div>
          )}
        </div>
      </div>

      {/* modal */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 16,
              padding: "32px 28px",
              width: 360,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              textAlign: "center",
            }}
          >
            {/* profile circle large */}
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: status.connected
                ? "linear-gradient(135deg, #7c3aed, #4c1d95)"
                : "linear-gradient(135deg, #e879f9, #818cf8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "white" }}>
                {status.connected ? initial : "✨"}
              </span>
            </div>

            {status.connected ? (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2d1b69", marginBottom: 4 }}>
                  {status.email}
                </h3>
                <p style={{ fontSize: 13, color: "#9d8ec4", marginBottom: 24, lineHeight: 1.6 }}>
                  Lexi has access to your Gmail, Calendar, and Drive.
                </p>
                <button
                  onClick={handleDisconnect}
                  style={{
                    width: "100%", padding: "10px", borderRadius: 8,
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.15)",
                    color: "#ef4444", fontSize: 14, cursor: "pointer",
                    fontWeight: 500, marginBottom: 8,
                  }}
                >
                  Disconnect Google
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    width: "100%", padding: "10px", borderRadius: 8,
                    background: "transparent", border: "none",
                    color: "#9d8ec4", fontSize: 13, cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#2d1b69", marginBottom: 8 }}>
                  Connect Google
                </h3>
                <p style={{ fontSize: 14, color: "#7c6aad", marginBottom: 8, lineHeight: 1.6 }}>
                  Give Lexi access to your Gmail, Calendar, and Drive.
                </p>
                <p style={{ fontSize: 12, color: "#9d8ec4", marginBottom: 28, lineHeight: 1.6 }}>
                  Your data is encrypted and never shared. Disconnect anytime.
                </p>
                <button
                  onClick={handleConnect}
                  style={{
                    width: "100%", padding: "12px",
                    borderRadius: 8, cursor: "pointer",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 10,
                    background: "white",
                    border: "1px solid rgba(0,0,0,0.12)",
                    fontSize: 15, fontWeight: 500, color: "#3c3c3c",
                    marginBottom: 10,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    width: "100%", padding: "10px", borderRadius: 8,
                    background: "transparent", border: "none",
                    color: "#9d8ec4", fontSize: 13, cursor: "pointer",
                  }}
                >
                  Maybe later
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}