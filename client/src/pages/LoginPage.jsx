import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const API = import.meta.env.VITE_API_URL || "http://localhost:5001";
      const res = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("userId", res.data.user._id);
      localStorage.setItem("fullName", res.data.user.fullName || res.data.user.email);
      if (res.data.user.role === "admin") navigate("/admin");
      else if (res.data.user.role === "mechanic") navigate("/mechanic");
      else navigate("/driver");
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      {/* ── Left: hero image ── */}
      <div className="auth-image-panel">
        <img
          src="https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=1200&q=80"
          alt="Car repair workshop"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
        {/* dark overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.75) 0%, rgba(30,27,75,0.7) 100%)",
          }}
        />
        {/* overlay content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "48px",
          }}
        >
          <div className="animate-fade-in">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 100,
                padding: "6px 14px",
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.06em" }}>
                ⚡ DRIVEAID PLATFORM
              </span>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: "#fff", marginBottom: 12, lineHeight: 1.2 }}>
              Roadside Help,<br />
              <span className="gradient-text">When You Need It</span>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(203,213,225,0.85)", maxWidth: 360, lineHeight: 1.6 }}>
              Connect with certified mechanics instantly. Get your vehicle back on the road fast.
            </p>
            <div style={{ display: "flex", gap: 32, marginTop: 28 }}>
              {[["500+", "Mechanics"], ["24/7", "Support"], ["4.9★", "Rating"]].map(([val, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{val}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: login form ── */}
      <div className="auth-form-panel animate-fade-in">
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 4px 16px rgba(245,158,11,0.35)",
              }}
            >
              🔧
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
              Drive<span style={{ color: "#f59e0b" }}>Aid</span>
            </span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32 }}>
            Sign in to access your dashboard
          </p>

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                fontSize: 14,
                color: "#f87171",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <a href="#" style={{ fontSize: 13, color: "#f59e0b", textDecoration: "none", fontWeight: 600 }}>
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: "14px", fontSize: 15, marginTop: 4, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In →"
              )}
            </button>
          </form>

          <div style={{ marginTop: 28, textAlign: "center", fontSize: 14, color: "#64748b" }}>
            New to DriveAid?{" "}
            <Link to="/register" style={{ color: "#f59e0b", fontWeight: 700, textDecoration: "none" }}>
              Create an account
            </Link>
          </div>

          {/* Role hint */}
          <div
            style={{
              marginTop: 32,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(148,163,184,0.1)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <p style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 8 }}>
              Available roles
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[["🚗", "Driver"], ["🔧", "Mechanic"], ["👨‍💼", "Admin"]].map(([icon, role]) => (
                <span
                  key={role}
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    background: "rgba(148,163,184,0.08)",
                    border: "1px solid rgba(148,163,184,0.12)",
                    borderRadius: 8,
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {icon} {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default LoginPage;
