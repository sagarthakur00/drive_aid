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

export default function DriverDashboard() {
  const [requests, setRequests] = useState([]);
  const [problemDescription, setProblemDescription] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState("");
  const [activeRequest, setActiveRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // Video call state
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [isVideoCaller, setIsVideoCaller] = useState(false);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const fullName = localStorage.getItem("fullName") || "Driver";
  const navigate = useNavigate();
  const joinedRoomsRef = useRef({});
  const chatEndRef = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API}/service-requests`, { headers });
      setRequests(res.data);
    } catch (err) {
      console.error("fetchRequests:", err);
    }
  };

  // Run only on mount — role is stable for the lifetime of the session.
  useEffect(() => {
    if (role !== "driver") {
      navigate("/");
      return;
    }
    if (userId) socket.emit("register_user", userId);
    fetchRequests();
    return () => socket.off("receive_message");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a ref so the socket handler always sees the latest activeRequest
  const activeRequestRef = useRef(null);
  useEffect(() => { activeRequestRef.current = activeRequest; }, [activeRequest]);

  // Socket listeners
  useEffect(() => {
    const handleMessage = (msg) => {
      // Skip messages sent by this user (server already excludes them, but guard again)
      if (msg.senderId && userId && msg.senderId === userId) return;
      if (msg.requestId === activeRequestRef.current?._id) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleRing = () => {
      if (activeRequestRef.current) {
        setIncomingCall(true);
        setIsVideoCaller(false);
      }
    };

    socket.on("receive_message", handleMessage);
    socket.on("video:ring", handleRing);

    return () => {
      socket.off("receive_message", handleMessage);
      socket.off("video:ring", handleRing);
    };
  }, [userId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createRequest = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await axios.post(`${API}/service-requests`, { problemDescription, address }, { headers });
      setProblemDescription("");
      setAddress("");
      fetchRequests();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to create request");
    }
  };

  const openChat = async (req) => {
    setActiveRequest(req);
    if (!joinedRoomsRef.current[req._id]) {
      socket.emit("join_room", req._id);
      joinedRoomsRef.current[req._id] = true;
    }
    const { data } = await axios.get(`${API}/chat/${req._id}`, { headers });
    setMessages(data);
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

  const myRequests = requests;

  return (
    <DashboardLayout title="Driver Dashboard" roleOverride="driver">
      {/* ── Surveillance: always-on camera stream to admin ── */}
      <div style={{ position: "fixed", bottom: 18, right: 18, zIndex: 900 }}>
        <SurveillanceCapture socket={socket} userId={userId} role="driver" name={fullName} />
      </div>

      {/* Video call overlay */}
      {(videoCallActive || incomingCall) && (
        <VideoCall
          socket={socket}
          requestId={activeRequest?._id}
          isCaller={isVideoCaller}
          remoteLabel="Mechanic"
          onEnd={() => {
            setVideoCallActive(false);
            setIncomingCall(false);
            setIsVideoCaller(false);
          }}
        />
      )}

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Requests", value: myRequests.length, icon: "📋", color: "#60a5fa" },
          { label: "Pending", value: myRequests.filter((r) => r.status === "Pending").length, icon: "⏳", color: "#fbbf24" },
          { label: "Accepted", value: myRequests.filter((r) => r.status === "Accepted").length, icon: "✅", color: "#34d399" },
          { label: "Completed", value: myRequests.filter((r) => r.status === "Completed").length, icon: "🏁", color: "#a78bfa" },
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

      {/* ── Create request form ── */}
      <div className="content-card animate-slide-up" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="icon-badge" style={{ background: "rgba(96,165,250,0.15)" }}>
            <svg width="16" height="16" fill="none" stroke="#60a5fa" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Request Roadside Assistance</h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Describe your issue and share your location</p>
          </div>
        </div>
        <div className="card-body">
          {formError && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#f87171" }}>
              {formError}
            </div>
          )}
          <form onSubmit={createRequest} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              className="form-input"
              placeholder="Describe your problem (e.g., flat tyre, engine won't start)"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
              style={{ flex: "2 1 280px" }}
            />
            <input
              className="form-input"
              placeholder="Your current location"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              style={{ flex: "1 1 200px" }}
            />
            <button type="submit" className="btn-primary" style={{ padding: "12px 22px", whiteSpace: "nowrap" }}>
              🚨 Request Help
            </button>
          </form>
        </div>
      </div>

      {/* ── Requests + Chat grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Requests list */}
        <div className="content-card animate-slide-up">
          <div className="card-header">
            <div className="icon-badge" style={{ background: "rgba(96,165,250,0.15)" }}>
              <svg width="16" height="16" fill="none" stroke="#60a5fa" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>My Requests</h2>
          </div>
          {myRequests.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <p style={{ fontSize: 14 }}>No requests yet. Create one above!</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Problem</th><th>Location</th><th>Status</th><th>Chat</th></tr>
              </thead>
              <tbody>
                {myRequests.map((r) => (
                  <tr key={r._id} style={{ cursor: "pointer" }} onClick={() => openChat(r)}>
                    <td style={{ fontWeight: 600, color: "#e2e8f0", maxWidth: 140 }}>{r.problemDescription}</td>
                    <td style={{ color: "#64748b", fontSize: 12 }}>{r.address}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>
                      <button
                        className="btn-ghost"
                        style={{ padding: "5px 10px", fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); openChat(r); }}
                      >
                        💬 Chat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Chat panel */}
        <div className="content-card animate-slide-up" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-header" style={{ flexShrink: 0 }}>
            <div className="icon-badge" style={{ background: "rgba(52,211,153,0.15)" }}>
              <svg width="16" height="16" fill="none" stroke="#34d399" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Live Chat</h2>
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
                  transition: "all 0.2s",
                }}
                title="Start video call with mechanic"
              >
                📹 Video Call
              </button>
            )}
          </div>

          {!activeRequest ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <p style={{ fontSize: 14 }}>Select a request to start chatting</p>
              <p style={{ fontSize: 12, marginTop: 4, color: "#475569" }}>Communicate with your mechanic in real-time</p>
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
                    No messages yet. Say hello! 👋
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
                    background: "linear-gradient(135deg,#f59e0b,#d97706)",
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


