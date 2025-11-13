import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

const DashboardLayout = ({ 
  children, 
  title, 
  icon, 
  gradient = 'from-blue-600 via-purple-600 to-indigo-800',
  actions 
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradient} relative overflow-hidden`}>
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl opacity-10 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl opacity-10 translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full blur-3xl opacity-5 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              {icon && <div className="text-4xl">{icon}</div>}
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  {title}
                </h1>
                <p className="text-white/70 text-sm mt-1">
                  Welcome back! Here's what's happening today.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {actions}
              <Button 
                variant="danger" 
                onClick={handleLogout}
                className="shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Button>
            </div>
          </div>

          {/* Main Content */}
          {children}
        </div>
      </div>
    </div>
  );
};

export { DashboardLayout };
