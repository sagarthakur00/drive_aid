import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import VideoCall from "../components/ui/VideoCall";
import SurveillanceCapture from "../components/ui/SurveillanceCapture";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const socket = io(API, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});

function MechanicDashboard() {
  const [requests, setRequests] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // Video call state
  const [videoCallActive, setVideoCallActive] = useState(false);
  // incomingCallRequest stores the requestId that rang so we can show a global banner
  const [incomingCallRequestId, setIncomingCallRequestId] = useState(null);
  const [isVideoCaller, setIsVideoCaller] = useState(false);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const fullName = localStorage.getItem("fullName") || "Mechanic";
  const navigate = useNavigate();
  const joinedRoomsRef = useRef({});
  const chatEndRef = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };

  // Register socket identity once on mount so the server knows this socket's userId
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) socket.emit("register_user", userId);
  }, []);

  const joinRoom = (requestId) => {
    if (!requestId || joinedRoomsRef.current[requestId]) return;
    socket.emit("join_room", requestId);
    joinedRoomsRef.current[requestId] = true;
  };

  const refreshRequests = async () => {
    try {
      const res = await axios.get(`${API}/service-requests`, { headers });
      const data = res.data;
      setRequests(data);
      // Join rooms for all non-pending requests so we receive messages & calls
      data.forEach((r) => {
        if (r.status !== "Pending") joinRoom(r._id);
      });
    } catch (err) {
      console.error("refreshRequests:", err);
    }
  };

  // Run only on mount — role is read from localStorage and won't change during a session.
  // Using [role] caused spurious navigate("/") calls whenever React re-evaluated the
  // closure with a stale/null value (e.g., during StrictMode double-invocation).
  useEffect(() => {
    if (role !== "mechanic") {
      navigate("/");
      return;
    }
    refreshRequests();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeRequestRef = useRef(null);
  useEffect(() => { activeRequestRef.current = activeRequest; }, [activeRequest]);

  // Capture video:offer at dashboard level so it's available before VideoCall mounts.
  // Without this, the offer arrives while the ring banner is showing (VideoCall not yet mounted)
  // and gets lost. The ref is passed as initialOffer to VideoCall.
  const incomingOfferRef = useRef(null);

  useEffect(() => {
    const handleMessage = (msg) => {
      if (msg.requestId === activeRequestRef.current?._id) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    // video:ring fires from the room — show notification regardless of chat panel state
    const handleRing = ({ from, requestId: ringRequestId }) => {
      console.log("[Mechanic] video:ring received, requestId:", ringRequestId);
      setIncomingCallRequestId(ringRequestId || "incoming");
      setIsVideoCaller(false);
      // If we don't have an active chat open for this request, set it automatically
      if (!activeRequestRef.current && ringRequestId) {
        setRequests((prev) => {
          const found = prev.find((r) => r._id === ringRequestId);
          if (found) setActiveRequest(found);
          return prev;
        });
      }
    };

    // Capture the offer before VideoCall mounts so it isn't lost
    const handleVideoOffer = ({ offer }) => {
      incomingOfferRef.current = offer;
    };

    const handleRequestDeleted = ({ id }) => {
      setRequests((prev) => prev.filter((r) => r._id !== id));
      if (activeRequestRef.current?._id === id) setActiveRequest(null);
    };

    socket.on("receive_message", handleMessage);
    socket.on("video:ring", handleRing);
    socket.on("video:offer", handleVideoOffer);
    socket.on("request:deleted", handleRequestDeleted);

    return () => {
      socket.off("receive_message", handleMessage);
      socket.off("video:ring", handleRing);
      socket.off("video:offer", handleVideoOffer);
      socket.off("request:deleted", handleRequestDeleted);
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const acceptRequest = async (reqId) => {
    try {
      const res = await axios.post(`${API}/service-requests/${reqId}/accept`, {}, { headers });
      // Immediately join the room so we can receive messages and calls
      joinRoom(reqId);
      refreshRequests();
    } catch (err) {
      console.error("acceptRequest error:", err?.response?.data || err.message);
      alert(err?.response?.data?.message || "Error accepting request");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.post(`${API}/service-requests/${id}/status`, { status }, { headers });
      refreshRequests();
    } catch (err) {
      console.error(err);
      alert("Error updating status");
    }
  };

  const openChat = async (req) => {
    setActiveRequest(req);
    joinRoom(req._id);
    try {
      const { data } = await axios.get(`${API}/chat/${req._id}`, { headers });
      setMessages(data);
    } catch (err) {
      console.error("openChat:", err?.response?.data || err.message);
    }
  };

  const send = async () => {
    if (!text.trim() || !activeRequest) return;
    const tempId = Date.now();
    const msg = text;
    setMessages((prev) => [...prev, { tempId, message: msg, createdAt: new Date().toISOString(), isSelf: true }]);
    setText("");
    try {
      const { data } = await axios.post(`${API}/chat/${activeRequest._id}`, { message: msg }, { headers });
      setMessages((prev) => prev.map((m) => (m.tempId === tempId ? { ...data, isSelf: true } : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
    }
  };

  const startVideoCall = () => {
    if (!activeRequest) return;
    setIsVideoCaller(true);
    setVideoCallActive(true);
  };


  const statusBadge = (status) => {
    const map = { Pending: "badge-pending", Accepted: "badge-accepted", Completed: "badge-completed" };
    return <span className={`badge ${map[status] || "badge-pending"}`}>{status}</span>;
  };

  const pending = requests.filter((r) => r.status === "Pending");
  const accepted = requests.filter((r) => r.status === "Accepted");
  const completed = requests.filter((r) => r.status === "Completed");

  return (
    <DashboardLayout title="Mechanic Dashboard" roleOverride="mechanic">
      {/* ── Surveillance: always-on camera stream to admin ── */}
      <div style={{ position: "fixed", bottom: 18, right: 18, zIndex: 900 }}>
        <SurveillanceCapture socket={socket} userId={userId} role="mechanic" name={fullName} />
      </div>

      {/* ── Global incoming call banner ── */}
      {incomingCallRequestId && !videoCallActive && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          zIndex: 1000, background: "linear-gradient(135deg,#1e293b,#0f172a)",
          border: "2px solid #34d399", borderRadius: 16, padding: "18px 28px",
          display: "flex", alignItems: "center", gap: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 4px rgba(52,211,153,0.2)",
          animation: "pulse 1.5s ease-in-out infinite",
          minWidth: 340,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(135deg,#34d399,#059669)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0
          }}>📹</div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, margin: 0 }}>Incoming Video Call</p>
            <p style={{ color: "#64748b", fontSize: 12, margin: "3px 0 0" }}>Driver is calling you</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                const targetId = incomingCallRequestId !== "incoming" ? incomingCallRequestId : null;
                const target = (targetId && requests.find((r) => r._id === targetId))
                  || activeRequestRef.current
                  || requests.find((r) => r.status === "Accepted");
                if (target) {
                  setActiveRequest(target);
                  joinRoom(target._id);
                }
                setIsVideoCaller(false);
                setVideoCallActive(true);
                setIncomingCallRequestId(null);
              }}
              style={{
                padding: "8px 16px", borderRadius: 10, border: "none",
                background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >Accept</button>
            <button
              onClick={() => {
                incomingOfferRef.current = null;
                const targetId = incomingCallRequestId !== "incoming" ? incomingCallRequestId : null;
                const target = (targetId && requests.find((r) => r._id === targetId))
                  || activeRequestRef.current
                  || requests.find((r) => r.status === "Accepted");
                if (target) socket.emit("video:reject", { requestId: target._id });
                setIncomingCallRequestId(null);
              }}
              style={{
                padding: "8px 16px", borderRadius: 10, border: "none",
                background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >Decline</button>
          </div>
        </div>
      )}

      {/* Video call overlay */}
      {videoCallActive && (
        <VideoCall
          socket={socket}
          requestId={activeRequest?._id || requests.find((r) => r.status === "Accepted")?._id}
          isCaller={isVideoCaller}
          initialOffer={isVideoCaller ? null : incomingOfferRef.current}
          remoteLabel="Driver"
          onEnd={() => {
            incomingOfferRef.current = null;
            setVideoCallActive(false);
            setIncomingCallRequestId(null);
            setIsVideoCaller(false);
          }}
        />
      )}

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "All Requests", value: requests.length, icon: "📋", color: "#34d399" },
          { label: "Pending", value: pending.length, icon: "⏳", color: "#fbbf24" },
          { label: "In Progress", value: accepted.length, icon: "🔧", color: "#60a5fa" },
          { label: "Completed", value: completed.length, icon: "✅", color: "#a78bfa" },
        ].map((s) => (
          <div key={s.label} className="stat-card animate-fade-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</p>
              </div>
              <span style={{ fontSize: 26, opacity: 0.8 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Service Requests */}
        <div className="content-card animate-slide-up">
          <div className="card-header">
            <div className="icon-badge" style={{ background: "rgba(52,211,153,0.15)" }}>
              <svg width="16" height="16" fill="none" stroke="#34d399" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Service Requests</h2>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>{requests.length} total</span>
          </div>
          {requests.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <p style={{ fontSize: 14 }}>No service requests available</p>
            </div>
          ) : (
            <div style={{ maxHeight: 480, overflowY: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr><th>Problem</th><th>Location</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r._id}>
                      <td style={{ fontWeight: 600, color: "#e2e8f0", maxWidth: 140 }}>{r.problemDescription}</td>
                      <td style={{ color: "#64748b", fontSize: 12 }}>{r.address || "—"}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {r.status === "Pending" && (
                            <button className="btn-success" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => acceptRequest(r._id)}>
                              Accept
                            </button>
                          )}
                          {r.status === "Accepted" && (
                            <button
                              onClick={() => updateStatus(r._id, "Completed")}
                              style={{ padding: "4px 10px", fontSize: 12, background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8, color: "#a78bfa", fontWeight: 600, cursor: "pointer" }}
                            >
                              Complete
                            </button>
                          )}
                          {r.status !== "Pending" && (
                            <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => openChat(r)}>
                              💬
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div className="content-card animate-slide-up" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-header" style={{ flexShrink: 0 }}>
            <div className="icon-badge" style={{ background: "rgba(96,165,250,0.15)" }}>
              <svg width="16" height="16" fill="none" stroke="#60a5fa" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Customer Chat</h2>
              {activeRequest && (
                <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{activeRequest.problemDescription}</p>
              )}
            </div>
            {activeRequest && (
              <button
                onClick={startVideoCall}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                title="Start video call with driver"
              >
                📹 Video Call
              </button>
            )}
          </div>

          {!activeRequest ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <p style={{ fontSize: 14 }}>Accept a request to start chatting</p>
              <p style={{ fontSize: 12, marginTop: 4, color: "#475569" }}>Communicate with drivers about their service needs</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16 }}>
              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "8px 0",
                  minHeight: 0,
                  maxHeight: 320,
                }}
              >
                {messages.length === 0 && (
                  <p style={{ textAlign: "center", color: "#475569", fontSize: 13, padding: "24px 0" }}>
                    No messages yet. Start the conversation! 💬
                  </p>
                )}
                {messages.map((m) => (
                  <div
                    key={m._id || m.tempId}
                    style={{ display: "flex", flexDirection: "column", alignItems: m.isSelf ? "flex-end" : "flex-start" }}
                  >
                    <div className={m.isSelf ? "chat-bubble-self" : "chat-bubble-other"}>
                      {m.message}
                    </div>
                    <span style={{ fontSize: 10, color: "#475569", marginTop: 3, padding: "0 4px" }}>
                      {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input
                  className="form-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Type a message…"
                  style={{ flex: 1, padding: "10px 14px" }}
                />
                <button
                  onClick={send}
                  disabled={!text.trim()}
                  style={{
                    padding: "10px 16px",
                    background: "linear-gradient(135deg,#34d399,#059669)",
                    border: "none",
                    borderRadius: 10,
                    color: "#0f172a",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: text.trim() ? "pointer" : "not-allowed",
                    opacity: text.trim() ? 1 : 0.5,
                  }}
                >
                  ➤
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default MechanicDashboard;
