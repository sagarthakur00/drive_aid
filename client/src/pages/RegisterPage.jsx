import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "driver",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axios.post("http://localhost:5001/auth/register", formData);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: "driver", icon: "🚗", label: "Driver", desc: "Request roadside help" },
    { id: "mechanic", icon: "🔧", label: "Mechanic", desc: "Provide repair services" },
    { id: "admin", icon: "👨‍💼", label: "Admin", desc: "Manage the platform" },
  ];

  return (
    <div className="auth-bg">
      {/* ── Left: hero image ── */}
      <div className="auth-image-panel">
        <img
          src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80"
          alt="Mechanic garage"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { e.target.style.display = "none"; }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(7,89,133,0.65) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "48px",
          }}
        >
          <div className="animate-slide-up">
            <div className="logo-mark" style={{ color: "#fff", marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🔧</div>
              Drive<span style={{ color: "#f59e0b" }}>Aid</span>
            </div>
            <h2 style={{ fontSize: 34, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 12 }}>
              Join Our Network of<br />
              <span className="gradient-text">Trusted Professionals</span>
            </h2>
            <p style={{ color: "rgba(203,213,225,0.8)", fontSize: 15, lineHeight: 1.7, maxWidth: 360, marginBottom: 32 }}>
              Whether you're a driver in need or a skilled mechanic, DriveAid connects the right people at the right time.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["✓  Instant matching with nearby mechanics", "✓  Real-time chat & video support", "✓  Transparent pricing & reviews"].map((item) => (
                <div key={item} style={{ fontSize: 14, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 8 }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: register form ── */}
      <div className="auth-form-panel animate-fade-in" style={{ padding: "32px 56px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <Link
            to="/"
            style={{ fontSize: 13, color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginBottom: 28 }}
          >
            ← Back to sign in
          </Link>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>
            Create your account
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
            Fill in your details to get started
          </p>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#f87171" }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Role picker */}
            <div className="form-group">
              <label className="form-label">I am a...</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r.id })}
                    style={{
                      padding: "12px 8px",
                      borderRadius: 10,
                      border: formData.role === r.id ? "2px solid #f59e0b" : "1.5px solid rgba(148,163,184,0.15)",
                      background: formData.role === r.id ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{r.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: formData.role === r.id ? "#f59e0b" : "#94a3b8" }}>
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  name="fullName"
                  placeholder="John Smith"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  type="tel"
                  name="phone"
                  placeholder="+1 555 000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    fontSize: 16,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: "14px", fontSize: 15, marginTop: 4, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Creating account..." : "Create Account →"}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "#64748b" }}>
            Already have an account?{" "}
            <Link to="/" style={{ color: "#f59e0b", fontWeight: 700, textDecoration: "none" }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
