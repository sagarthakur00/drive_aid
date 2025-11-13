import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";

function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "driver",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreeToTerms) {
      alert("Please agree to the terms to continue");
      return;
    }
    try {
      await axios.post("http://localhost:5001/auth/register", formData);
      alert("Registration successful. Please login.");
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Enhanced background elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}} />
      </div>

      <div className="grid md:grid-cols-2 w-full max-w-6xl mx-auto rounded-3xl shadow-2xl overflow-hidden relative z-10">
        {/* Image Side */}
        <Card variant="dark" className="hidden md:flex flex-col relative overflow-hidden">
          <img
            src="https://img.freepik.com/free-photo/muscular-car-service-worker-repairing-vehicle_146671-19605.jpg"
            alt="Auto repair"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/80 to-indigo-900/80" />
          <div className="relative z-10 p-10 mt-auto mb-10 space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass-effect border border-white/20">
              <span className="gradient-text text-sm font-bold tracking-wide">DRIVEAID</span>
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
            </div>
            <h2 className="text-4xl font-bold leading-tight text-white drop-shadow-xl">Join DriveAid</h2>
            <p className="text-gray-200 text-lg max-w-sm leading-relaxed">Choose your role and get started. Drivers request help, mechanics provide services, admins manage the platform.</p>
          </div>
        </Card>

        {/* Form Side */}
        <Card variant="dark" className="relative flex flex-col p-8 md:p-12">
          <div className="space-y-2">
            <Link to="/" className="text-xs text-gray-400 hover:text-gray-300">← Back to login</Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
                <span className="text-2xl">🚗</span>
              </div>
              <h1 className="text-3xl font-semibold text-white tracking-tight">Create your account</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <Input
              label="Full Name"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              required
              variant="dark"
            />
            
            <Input
              label="Email Address"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              variant="dark"
              icon={({ className }) => (
                <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              )}
            />
            
            <Input
              label="Phone Number"
              type="tel"
              name="phone"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={handleChange}
              required
              variant="dark"
            />
            
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                variant="dark"
                icon={({ className }) => (
                  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.543 7-4.478 0-8.268-2.943-9.543-7a10.025 10.025 0 014.134-5.411z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {/* Role Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">Choose your role</label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant={formData.role === "driver" ? "primary" : "ghost"}
                  onClick={() => setFormData({ ...formData, role: "driver" })}
                  className="flex-col h-16 text-sm"
                >
                  🚗
                  Driver
                </Button>
                <Button
                  type="button"
                  variant={formData.role === "mechanic" ? "success" : "ghost"}
                  onClick={() => setFormData({ ...formData, role: "mechanic" })}
                  className="flex-col h-16 text-sm"
                >
                  🔧
                  Mechanic
                </Button>
                <Button
                  type="button"
                  variant={formData.role === "admin" ? "warning" : "ghost"}
                  onClick={() => setFormData({ ...formData, role: "admin" })}
                  className="flex-col h-16 text-sm"
                >
                  👤
                  Admin
                </Button>
              </div>
            </div>
            
            {/* Terms */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <label htmlFor="terms" className="text-sm text-gray-400">
                I agree to the{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Terms & Conditions
                </a>
              </label>
            </div>
            
            {/* Submit */}
            <Button type="submit" className="w-full" size="lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Create Account
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default RegisterPage;
