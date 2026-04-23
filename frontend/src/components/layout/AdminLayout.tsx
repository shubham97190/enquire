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

export default function AdminLayout() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: HiOutlineChartBarSquare },
    { to: '/admin/surveys', label: 'Surveys', icon: HiOutlineDocumentText },
    ...(isSuperAdmin ? [{ to: '/admin/users', label: 'Users', icon: HiOutlineUsers }] : []),
  ];

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

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || user?.username?.[0]?.toUpperCase() || '?';

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
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-bold text-base">S</span>
          </div>
          {sidebarOpen && (
            <div>
              <span className="font-bold text-slate-800 text-[15px] tracking-tight">SurveyPanel</span>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                {isSuperAdmin ? 'Admin Console' : 'Form Builder'}
              </p>
            </div>
          )}
        </div>

        {/* User info pill (collapsed: avatar only) */}
        {sidebarOpen && (
          <div className="mx-3 mt-4 mb-1 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{user?.email}</p>
            </div>
          </div>
        )}
        {!sidebarOpen && (
          <div className="flex justify-center mt-4 mb-1">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-2 space-y-0.5 px-2">
          {sidebarOpen && (
            <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navigation</p>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <HiOutlineArrowRightOnRectangle className="w-[18px] h-[18px] flex-shrink-0" />
            {sidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Toggle sidebar"
          >
            <HiOutlineBars3 className="w-5 h-5" />
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
