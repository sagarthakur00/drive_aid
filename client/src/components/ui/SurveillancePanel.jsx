import { useEffect, useRef, useState, useCallback } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ],
};

/**
 * Single feed card for one remote user.
 * The user (SurveillanceCapture) is the OFFERER.
 * The admin (this component) is the ANSWERER.
 *
 * IMPORTANT: No sub-components are defined inside this function body.
 * Defining a component inside another component causes React to unmount/remount
 * it on every re-render, which destroys the video srcObject.
 */
function SurveillanceFeed({ socket, userId, role, name, fromSocketId }) {
  const videoRef = useRef(null);
  const expandedVideoRef = useRef(null);
  const pcRef = useRef(null);
  const iceQueueRef = useRef([]);
  const streamRef = useRef(null); // keep stream so we can re-attach after expand opens
  const [feedState, setFeedState] = useState("connecting"); // connecting | active | offline
  const [expanded, setExpanded] = useState(false);

  const requestWatch = useCallback(() => {
    socket.emit("surveillance:request", { targetUserId: userId });
  }, [socket, userId]);

  // Re-attach stream to expanded video when modal opens
  useEffect(() => {
    if (expanded && expandedVideoRef.current && streamRef.current) {
      expandedVideoRef.current.srcObject = streamRef.current;
      expandedVideoRef.current.play().catch(() => {});
    }
  }, [expanded]);

  useEffect(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        const stream = e.streams[0];
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setFeedState("active");
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit("surveillance:ice", { toSocketId: fromSocketId, candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[SurveillanceFeed] ICE state for ${name}:`, pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        pc.restartIce?.();
      }
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "closed") {
        setFeedState("offline");
      }
    };

    const handleOffer = async ({ offer, fromSocketId: senderSocketId }) => {
      if (senderSocketId !== fromSocketId) return;
      console.log("[SurveillanceFeed] received offer from", senderSocketId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        for (const c of iceQueueRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceQueueRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("surveillance:answer", { toSocketId: senderSocketId, answer });
        console.log("[SurveillanceFeed] answer sent to", senderSocketId);
      } catch (err) {
        console.error("[SurveillanceFeed] offer handling error:", err);
      }
    };

    const handleIce = ({ candidate, fromSocketId: senderSocketId }) => {
      if (senderSocketId !== fromSocketId) return;
      if (pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      } else {
        iceQueueRef.current.push(candidate);
      }
    };

    socket.on("surveillance:offer", handleOffer);
    socket.on("surveillance:ice", handleIce);
    requestWatch();

    return () => {
      socket.off("surveillance:offer", handleOffer);
      socket.off("surveillance:ice", handleIce);
      pc.close();
    };
  }, [socket, fromSocketId, name, requestWatch]);

  const roleColor = role === "driver" ? "#60a5fa" : "#34d399";
  const roleIcon = role === "driver" ? "🚗" : "🔧";

  return (
    <>
      {/* ── Feed Card ── */}
      <div
        onClick={() => feedState === "active" && setExpanded(true)}
        style={{
          background: "#0f172a",
          border: `1px solid ${feedState === "active" ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column",
          position: "relative", cursor: feedState === "active" ? "pointer" : "default",
          transition: "border-color 0.3s, box-shadow 0.3s",
          boxShadow: feedState === "active" ? "0 0 0 1px rgba(239,68,68,0.15)" : "none",
        }}
      >
        {/* Live / Connecting / Offline badge */}
        <div style={{
          position: "absolute", top: 10, left: 10, zIndex: 2,
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
          borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
          color: feedState === "active" ? "#ef4444" : "#94a3b8",
          border: `1px solid ${feedState === "active" ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.05)"}`,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: feedState === "active" ? "#ef4444" : "#64748b",
            display: "inline-block",
            animation: feedState === "active" ? "livePulse 1.5s ease-in-out infinite" : "none",
          }} />
          {feedState === "active" ? "LIVE" : feedState === "offline" ? "OFFLINE" : "Connecting…"}
        </div>

        {feedState === "active" && (
          <div style={{
            position: "absolute", top: 10, right: 10, zIndex: 2,
            background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "3px 7px",
            fontSize: 10, color: "#94a3b8",
          }}>⛶ Expand</div>
        )}

        {/* ── Video wrapper — inlined, never a sub-component ── */}
        <div style={{ position: "relative", background: "#1e293b", aspectRatio: "16/9" }}>
          {/* Video element is ALWAYS rendered so videoRef stays stable */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {feedState !== "active" && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              background: "rgba(15,23,42,0.9)", gap: 8,
            }}>
              <span style={{ fontSize: 28 }}>{feedState === "offline" ? "📵" : "📡"}</span>
              <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
                {feedState === "offline" ? "Feed disconnected" : "Connecting to stream…"}
              </p>
              {feedState === "offline" && (
                <button
                  onClick={(e) => { e.stopPropagation(); setFeedState("connecting"); requestWatch(); }}
                  style={{
                    marginTop: 4, padding: "5px 14px", borderRadius: 8, border: "none",
                    background: "rgba(96,165,250,0.2)", color: "#60a5fa",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}
                >Retry</button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, background: "#0f172a" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `${roleColor}20`, border: `1.5px solid ${roleColor}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, flexShrink: 0,
          }}>{roleIcon}</div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>{name}</p>
            <p style={{ margin: 0, fontSize: 11, color: roleColor, fontWeight: 600, textTransform: "capitalize" }}>{role}</p>
          </div>
        </div>
      </div>

      {/* ── Fullscreen modal ── */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.92)", display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 900, background: "#0f172a",
              borderRadius: 16, overflow: "hidden",
              boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", background: "#1e293b",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <span style={{ fontSize: 18 }}>{roleIcon}</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{name}</p>
                <p style={{ margin: 0, fontSize: 11, color: roleColor, fontWeight: 600, textTransform: "capitalize" }}>{role}</p>
              </div>
              <div style={{
                marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: "rgba(239,68,68,0.15)", color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.3)",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#ef4444",
                  display: "inline-block", animation: "livePulse 1.5s ease-in-out infinite",
                }} />
                LIVE
              </div>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  marginLeft: 12, background: "rgba(239,68,68,0.15)", border: "none",
                  borderRadius: 8, color: "#f87171", padding: "6px 12px",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >✕ Close</button>
            </div>
            {/* Expanded video — srcObject is set via useEffect when expanded=true */}
            <video
              ref={expandedVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%", display: "block",
                maxHeight: "70vh", objectFit: "contain", background: "#000",
              }}
            />
          </div>
          <p style={{ color: "#64748b", fontSize: 12, marginTop: 12 }}>Click outside to close</p>
        </div>
      )}

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </>
  );
}

/**
 * SurveillancePanel
 *
 * Drop this in the AdminDashboard.
 * Listens for users coming online/offline,
 * renders a SurveillanceFeed card per active user.
 *
 * Props:
 *   socket – socket.io instance shared by the admin page
 */
export default function SurveillancePanel({ socket }) {
  const [activeUsers, setActiveUsers] = useState([]); // [{ userId, role, name, socketId }]

  useEffect(() => {
    // Register as an admin viewer
    socket.emit("surveillance:admin_join");

    const handleActiveList = (list) => {
      setActiveUsers(list.map((u) => ({ ...u, socketId: u.socketId })));
    };

    const handleUserOnline = ({ userId, role, name, socketId }) => {
      setActiveUsers((prev) => {
        const exists = prev.find((u) => u.userId === userId);
        if (exists) return prev.map((u) => u.userId === userId ? { userId, role, name, socketId } : u);
        return [...prev, { userId, role, name, socketId }];
      });
    };

    const handleUserOffline = ({ userId }) => {
      setActiveUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    socket.on("surveillance:active_list", handleActiveList);
    socket.on("surveillance:user_online", handleUserOnline);
    socket.on("surveillance:user_offline", handleUserOffline);

    return () => {
      socket.off("surveillance:active_list", handleActiveList);
      socket.off("surveillance:user_online", handleUserOnline);
      socket.off("surveillance:user_offline", handleUserOffline);
    };
  }, [socket]);

  return (
    <div className="content-card animate-slide-up" style={{ marginBottom: 24 }}>
      {/* Header */}
      <div className="card-header">
        <div className="icon-badge" style={{ background: "rgba(239,68,68,0.15)" }}>
          <svg width="16" height="16" fill="none" stroke="#ef4444" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Live Surveillance</h2>
          <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Real-time camera feeds from active drivers and mechanics</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {activeUsers.length > 0 && (
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: "rgba(239,68,68,0.15)", color: "#f87171",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: "#ef4444",
                display: "inline-block", animation: "pulse 1.5s ease-in-out infinite",
              }} />
              {activeUsers.length} Live
            </span>
          )}
        </div>
      </div>

      {/* Feed grid */}
      {activeUsers.length === 0 ? (
        <div className="empty-state" style={{ padding: "40px 0" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 40, height: 40 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
          <p style={{ fontSize: 14, marginTop: 12 }}>No active streams</p>
          <p style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
            Streams appear automatically when a driver or mechanic logs in
          </p>
        </div>
      ) : (
        <div
          style={{
            padding: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {activeUsers.map((u) => (
            <SurveillanceFeed
              key={u.userId}
              socket={socket}
              userId={u.userId}
              role={u.role}
              name={u.name}
              fromSocketId={u.socketId}
              onDisconnect={(uid) => setActiveUsers((prev) => prev.filter((x) => x.userId !== uid))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
