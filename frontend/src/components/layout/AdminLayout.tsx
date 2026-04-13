import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineChartBarSquare,
  HiOutlineDocumentText,
  HiOutlineUsers,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
} from 'react-icons/hi2';
import { useState } from 'react';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: HiOutlineChartBarSquare },
  { to: '/admin/surveys', label: 'Surveys', icon: HiOutlineDocumentText },
  { to: '/admin/users', label: 'Users', icon: HiOutlineUsers },
];

export default function AdminLayout() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    navigate('/admin/login');
    toast.success('Logged out');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Sidebar ──────────────────────────────── */}
      <aside
        className={`${
          sidebarOpen ? 'w-60' : 'w-[72px]'
        } bg-white border-r border-slate-200 flex flex-col transition-all duration-200 shadow-sm`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100 gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-base">S</span>
          </div>
          {sidebarOpen && (
            <span className="font-bold text-slate-800 text-base tracking-tight">SurveyPanel</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {navItems
            .filter((item) => item.to !== '/admin/users' || user?.role === 'SUPER_ADMIN')
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            ))}
        </nav>

        {/* User & Logout */}
        <div className="p-2 border-t border-slate-100">
          {sidebarOpen && (
            <div className="px-3 py-2 mb-1">
              <p className="text-sm font-medium text-slate-700 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <HiOutlineArrowRightOnRectangle className="w-[18px] h-[18px] flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Toggle sidebar"
          >
            <HiOutlineBars3 className="w-6 h-6" />
          </button>
          <div className="text-xs text-slate-400 font-medium">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
