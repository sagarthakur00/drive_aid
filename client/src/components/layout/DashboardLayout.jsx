import { useNavigate } from 'react-router-dom';

const roleConfig = {
  admin:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', label: 'Administrator', icon: '👨‍💼' },
  mechanic: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', label: 'Mechanic',       icon: '🔧' },
  driver:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', label: 'Driver',          icon: '🚗' },
};

const DashboardLayout = ({ children, title, roleOverride }) => {
  const navigate = useNavigate();
  const storedRole = localStorage.getItem('role') || 'driver';
  const role = roleOverride || storedRole;
  const cfg = roleConfig[role] || roleConfig.driver;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#f1f5f9' }}>
      {/* ── Top navigation bar ── */}
      <nav
        style={{
          height: 64,
          background: 'rgba(15,23,42,0.98)',
          borderBottom: '1px solid rgba(148,163,184,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo + Page title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                boxShadow: '0 2px 10px rgba(245,158,11,0.3)',
              }}
            >
              🔧
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
              Drive<span style={{ color: '#f59e0b' }}>Aid</span>
            </span>
          </div>

          <div style={{ width: 1, height: 24, background: 'rgba(148,163,184,0.12)' }} />

          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            {title}
          </h1>
        </div>

        {/* Right side: role badge + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              background: cfg.bg,
              border: `1px solid ${cfg.color}30`,
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 700,
              color: cfg.color,
              letterSpacing: '0.03em',
            }}
          >
            {cfg.icon} {cfg.label}
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8,
              color: '#f87171',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main style={{ padding: '32px', maxWidth: 1280, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
};

export { DashboardLayout };

