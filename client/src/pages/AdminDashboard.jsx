import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import SurveillancePanel from "../components/ui/SurveillancePanel";

const API = "http://localhost:5001";

const socket = io(API, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});

function AdminDashboard() {
  const [mechanics, setMechanics] = useState([]);
  const [requests, setRequests] = useState([]);
  const [problemDescription, setProblemDescription] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState("");
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const navigate = useNavigate();

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [mechRes, reqRes] = await Promise.all([
        axios.get(`${API}/mechanics`, { headers }),
        axios.get(`${API}/service-requests`, { headers }),
      ]);
      setMechanics(mechRes.data);
      setRequests(reqRes.data);
    } catch (err) {
      console.error("Error fetching:", err);
    }
  };

  useEffect(() => {
    if (role !== "admin") {
      navigate("/");
      return;
    }
    // Register socket identity
    const userId = localStorage.getItem("userId");
    if (userId) socket.emit("register_user", userId);
    fetchData();
  }, [role]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await axios.post(`${API}/service-requests`, { problemDescription, address }, { headers });
      setProblemDescription("");
      setAddress("");
      fetchData();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to create request");
    }
  };

  const verifyMechanic = async (id) => {
    try {
      await axios.put(`${API}/mechanics/${id}/verify`, { isVerified: true }, { headers });
      fetchData();
    } catch {
      alert("Error verifying mechanic");
    }
  };

  const statItems = [
    { label: "Total Mechanics", value: mechanics.length, icon: "🔧", color: "#34d399" },
    { label: "Verified", value: mechanics.filter((m) => m.isVerified).length, icon: "✅", color: "#60a5fa" },
    { label: "Pending Review", value: mechanics.filter((m) => !m.isVerified).length, icon: "⏳", color: "#fbbf24" },
    { label: "Service Requests", value: requests.length, icon: "📋", color: "#a78bfa" },
  ];

  return (
    <DashboardLayout title="Admin Dashboard" roleOverride="admin">
      {/* ── Live Surveillance ── */}
      <SurveillancePanel socket={socket} />

      {/* ── Stats row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {statItems.map((s) => (
          <div key={s.label} className="stat-card animate-fade-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  {s.label}
                </p>
                <p style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.value}</p>
              </div>
              <span style={{ fontSize: 28, opacity: 0.8 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Create Service Request ── */}
      <div className="content-card animate-slide-up" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="icon-badge" style={{ background: "rgba(167,139,250,0.15)" }}>
            <svg width="16" height="16" fill="none" stroke="#a78bfa" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Create Service Request</h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Manually create a new roadside assistance request</p>
          </div>
        </div>
        <div className="card-body">
          {formError && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f87171" }}>
              {formError}
            </div>
          )}
          <form onSubmit={handleCreateRequest} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              className="form-input"
              placeholder="Problem description…"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
              style={{ flex: "1 1 240px" }}
            />
            <input
              className="form-input"
              placeholder="Address / location"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              style={{ flex: "1 1 200px" }}
            />
            <button type="submit" className="btn-primary" style={{ padding: "12px 24px", whiteSpace: "nowrap" }}>
              + Create Request
            </button>
          </form>
        </div>
      </div>

      {/* ── Bottom grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: 24 }}>
        {/* Mechanics Table */}
        <div className="content-card animate-slide-up">
          <div className="card-header">
            <div className="icon-badge" style={{ background: "rgba(52,211,153,0.15)" }}>
              <svg width="16" height="16" fill="none" stroke="#34d399" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Mechanics</h2>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>{mechanics.length} total</span>
          </div>
          {mechanics.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              <p style={{ fontSize: 14 }}>No mechanics registered yet</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Shop Name</th>
                  <th>Services</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {mechanics.map((m) => (
                  <tr key={m._id}>
                    <td style={{ fontWeight: 600, color: "#e2e8f0" }}>{m.shopName}</td>
                    <td style={{ color: "#64748b", fontSize: 12 }}>{m.services?.join(", ")}</td>
                    <td>
                      <span className={`badge ${m.isVerified ? "badge-verified" : "badge-warning"}`}>
                        {m.isVerified ? "✅ Verified" : "⏳ Pending"}
                      </span>
                    </td>
                    <td>
                      {!m.isVerified && (
                        <button className="btn-success" onClick={() => verifyMechanic(m._id)}>
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Service Requests Table */}
        <div className="content-card animate-slide-up">
          <div className="card-header">
            <div className="icon-badge" style={{ background: "rgba(96,165,250,0.15)" }}>
              <svg width="16" height="16" fill="none" stroke="#60a5fa" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Service Requests</h2>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>{requests.length} total</span>
          </div>
          {requests.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <p style={{ fontSize: 14 }}>No service requests yet</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 600, color: "#e2e8f0", maxWidth: 180 }}>{r.problemDescription}</td>
                    <td style={{ color: "#64748b", fontSize: 12 }}>{r.address || "—"}</td>
                    <td>
                      <span className={`badge ${
                        r.status === "Pending" ? "badge-pending" :
                        r.status === "Accepted" ? "badge-accepted" : "badge-completed"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
