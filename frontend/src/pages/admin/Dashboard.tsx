import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as api from '../../api/endpoints';
import type { FormsDashboardData } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineInboxStack,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineSparkles,
  HiOutlinePencilSquare,
} from 'react-icons/hi2';

// ── Chart type options ────────────────────────────────
type ChartType = 'line' | 'bar' | 'area';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
  { value: 'area', label: 'Area' },
];

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ── Stat Card ─────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  trend,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  trend?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-extrabold text-slate-800 tabular-nums">{value.toLocaleString()}</p>
        {trend && <p className="text-[11px] text-slate-400 mt-1">{trend}</p>}
      </div>
    </div>
  );
}

// ── Chart wrapper with type switcher ─────────────────
function TrendChart({
  data,
  title,
  dataKey,
  xKey,
  xFormatter,
  tooltipFormatter,
  color = '#3b82f6',
  gradientId = 'areaGrad',
}: {
  data: { [key: string]: unknown }[];
  title: string;
  dataKey: string;
  xKey: string;
  xFormatter?: (v: string) => string;
  tooltipFormatter?: (v: string) => string;
  color?: string;
  gradientId?: string;
}) {
  const [chartType, setChartType] = useState<ChartType>('area');

  const renderChart = () => {
    const common = {
      data,
      margin: { top: 5, right: 10, left: -20, bottom: 0 },
    };
    const axis = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={xFormatter}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          labelFormatter={tooltipFormatter ?? ((v) => String(v))}
        />
      </>
    );

    if (chartType === 'bar') {
      return (
        <BarChart {...common}>
          {axis}
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      );
    }
    if (chartType === 'line') {
      return (
        <LineChart {...common}>
          {axis}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      );
    }
    // area (default)
    return (
      <AreaChart {...common}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {axis}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 5, fill: color }}
        />
      </AreaChart>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {CHART_TYPES.map((ct) => (
            <button
              key={ct.value}
              onClick={() => setChartType(ct.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                chartType === ct.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          No data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          {renderChart()}
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<FormsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const isStaff = user?.role === 'STAFF';
  const displayName = user?.first_name || user?.username || 'there';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ──────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-4 -right-4 w-48 h-48 rounded-full bg-white/20" />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/10" />
        </div>
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HiOutlineSparkles className="w-4 h-4 text-blue-200" />
              <span className="text-blue-200 text-sm font-medium">{greeting}, {displayName}!</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              {isStaff ? 'My Dashboard' : 'Admin Dashboard'}
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              {isStaff
                ? 'Overview of your surveys and responses'
                : 'Platform-wide overview of all surveys and responses'}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/surveys')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold rounded-xl transition border border-white/20 backdrop-blur-sm"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
            New Survey
          </button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Surveys" value={data.total_forms} icon={HiOutlineDocumentText} color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="Active" value={data.active_forms} icon={HiOutlineCheckCircle} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard label="Inactive" value={data.inactive_forms} icon={HiOutlineXCircle} color="text-slate-400" bg="bg-slate-50" />
        <StatCard label="Total Responses" value={data.total_submissions} icon={HiOutlineInboxStack} color="text-violet-600" bg="bg-violet-50" />
        <StatCard label="Today" value={data.today_submissions} icon={HiOutlineClock} color="text-amber-600" bg="bg-amber-50" />
        <StatCard label="This Month" value={data.monthly_submissions} icon={HiOutlineCalendar} color="text-sky-600" bg="bg-sky-50" />
      </div>

      {/* ── Charts Row ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart
          data={data.daily_trend as { [key: string]: unknown }[]}
          title="Daily Responses (Last 30 Days)"
          dataKey="count"
          xKey="date"
          color="#10b981"
          gradientId="dailyGrad"
          xFormatter={(v) =>
            new Date(v).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
          }
          tooltipFormatter={(v) => new Date(v).toLocaleDateString('en-US')}
        />

        <TrendChart
          data={data.monthly_trend as { [key: string]: unknown }[]}
          title="Monthly Responses (Last 12 Months)"
          dataKey="count"
          xKey="month"
          color="#8b5cf6"
          gradientId="monthlyGrad"
          xFormatter={(v) =>
            new Date(v).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          }
          tooltipFormatter={(v) =>
            new Date(v).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          }
        />
      </div>

      {/* ── Top Surveys + Device Breakdown ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top surveys bar chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Top Surveys by Responses</h3>
          {data.top_forms.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              No submissions yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={data.top_forms.slice(0, 6)}
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="form_title"
                  width={120}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + '…' : v}
                />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="submission_count" radius={[0, 4, 4, 0]} maxBarSize={22} name="Responses">
                  {data.top_forms.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4'][i % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Device breakdown pie */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Device Breakdown</h3>
          {data.device_breakdown.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              No device data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.device_breakdown}
                  dataKey="count"
                  nameKey="device_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={3}
                  label={({ device_type, percent }) =>
                    `${device_type} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {data.device_breakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => (
                    <span className="text-xs capitalize text-slate-600">{value}</span>
                  )}
                />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent Surveys Table ─────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Recent Surveys</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Click a row to open in edit mode</p>
          </div>
          <Link
            to="/admin/surveys"
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            View all
          </Link>
        </div>
        {data.recent_forms.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">
            No surveys created yet.{' '}
            <Link to="/admin/surveys" className="text-blue-600 hover:underline">
              Create your first one.
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Survey</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fields</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Responses</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.recent_forms.map((form) => (
                <tr
                  key={form.id}
                  onClick={() => navigate(`/admin/surveys/${form.id}/builder`)}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800 truncate max-w-[200px] group-hover:text-blue-700 transition-colors">{form.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">/{form.slug}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        form.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${form.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {form.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">{form.field_count}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-700">{form.submission_count}</td>
                  <td className="px-5 py-3 text-right text-slate-400 text-xs">
                    {new Date(form.created_at).toLocaleDateString('en-US', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/surveys/${form.id}/builder`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
                      >
                        Edit
                      </Link>
                      <Link
                        to={`/admin/surveys/${form.id}/submissions`}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors px-2 py-1 rounded-lg hover:bg-slate-50"
                      >
                        Responses
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

