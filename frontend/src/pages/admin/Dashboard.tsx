import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as api from '../../api/endpoints';
import type { FormsDashboardData } from '../../types';
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
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value.toLocaleString()}</p>
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
}: {
  data: { [key: string]: unknown }[];
  title: string;
  dataKey: string;
  xKey: string;
  xFormatter?: (v: string) => string;
  tooltipFormatter?: (v: string) => string;
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
          <Bar dataKey={dataKey} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
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
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      );
    }
    // area (default)
    return (
      <AreaChart {...common}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        {axis}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#areaGrad)"
          dot={false}
          activeDot={{ r: 5, fill: '#3b82f6' }}
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
  const [data, setData] = useState<FormsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Overview of your surveys and responses</p>
        </div>
        <Link
          to="/admin/surveys"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          + New Survey
        </Link>
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
                data={data.top_forms}
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
                <Bar dataKey="submission_count" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20} name="Responses" />
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
          <h3 className="text-sm font-semibold text-slate-700">Recent Surveys</h3>
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
                <tr key={form.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800 truncate max-w-[200px]">{form.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">/{form.slug}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        form.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {form.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">{form.field_count}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-700">{form.submission_count}</td>
                  <td className="px-5 py-3 text-right text-slate-400 text-xs">
                    {new Date(form.created_at).toLocaleDateString('en-US', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to={`/admin/surveys/${form.id}/builder`}
                      className="text-xs text-blue-600 hover:underline mr-3"
                    >
                      Edit
                    </Link>
                    <Link
                      to={`/admin/surveys/${form.id}/submissions`}
                      className="text-xs text-slate-500 hover:underline"
                    >
                      Responses
                    </Link>
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

