import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  if (isAuthenticated) {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }

  const validate = () => {
    const errs: { username?: string; password?: string } = {};
    if (!username.trim()) errs.username = 'Username is required';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await login(username.trim(), password);
      toast.success('Welcome back!');
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { detail?: string } } };
      toast.error(axErr.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-slate-900 bg-white">
      {/* Left Column: Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative z-10">
        <div className="w-full max-w-md animate-fade-in text-left">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold text-xl leading-none">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">SurveyPanel</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">Welcome back</h1>
          <p className="text-slate-500 mb-8 font-medium">Please enter your details to sign in to your admin account.</p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Username
              </label>
              <div className="relative group">
                <HiOutlineUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors.username) setErrors((p) => ({ ...p, username: undefined }));
                  }}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border bg-slate-50 text-sm font-medium transition-all focus:outline-none focus:ring-4 focus:bg-white ${
                    errors.username
                      ? 'border-red-400 bg-red-50 focus:ring-red-500/20'
                      : 'border-transparent focus:border-blue-500 focus:ring-blue-500/20 hover:bg-slate-100'
                  }`}
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
              {errors.username && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative group">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  className={`w-full pl-11 pr-11 py-3 rounded-xl border bg-slate-50 text-sm font-medium transition-all focus:outline-none focus:ring-4 focus:bg-white ${
                    errors.password
                      ? 'border-red-400 bg-red-50 focus:ring-red-500/20'
                      : 'border-transparent focus:border-blue-500 focus:ring-blue-500/20 hover:bg-slate-100'
                  }`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 active:bg-slate-950 focus:ring-4 focus:ring-slate-900/20 transition-all disabled:opacity-50 text-sm shadow-lg shadow-slate-900/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-xs font-medium text-slate-500 mt-10">
            SurveyPanel Admin &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Right Column: Visual / Graphic */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 p-12 items-center justify-center overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[120px]" />
        
        {/* Abstract UI representation */}
        <div className="relative z-10 w-full max-w-lg">
          <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl p-8 shadow-2xl">
            <div className="flex gap-3 mb-8">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
              Create, Manage, and Analyze beautifully.
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-8">
              Everything you need to gather feedback, visualize insights, and make data-driven decisions seamlessly from a powerful centralized dashboard.
            </p>
            
            <div className="space-y-4">
              <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-blue-400 rounded-full" />
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div className="w-1/2 h-full bg-white/30 rounded-full" />
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div className="w-5/6 h-full bg-white/30 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
