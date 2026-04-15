import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as api from '../../api/endpoints';
import type { FormReportData } from '../../types';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#d97706', '#6366f1'];

function KpiCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const ring: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-1">
      <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md self-start ${ring[color] || ring.blue}`}>
        {label}
      </span>
      <p className="text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-blue-600">{payload[0].value} submissions</p>
    </div>
  );
};

export default function FormReport() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<FormReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .getFormReport(id)
      .then(setData)
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">No report data available</p>;

  const avgCompletion =
    data.field_completion.length > 0
      ? data.field_completion.reduce((s, f) => s + f.rate, 0) / data.field_completion.length
      : 0;
  const topLocation = data.location_breakdown[0];

  return (
    <div className="space-y-8">
      {/* ── Page header ─────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to={`/admin/surveys/${id}/builder`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Form
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{data.form_title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Detailed analytics report</p>
        </div>
        <Link
          to={`/admin/surveys/${id}/submissions`}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          View Submissions
        </Link>
      </div>

      {/* ── KPI Cards ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Submissions" value={data.total_submissions.toLocaleString()} color="blue" />
        <KpiCard label="Fields Tracked" value={data.field_completion.length} color="violet" />
        <KpiCard label="Avg Completion" value={`${avgCompletion.toFixed(1)}%`} sub="across all fields" color="emerald" />
        <KpiCard
          label="Top Location"
          value={topLocation ? (topLocation.city || topLocation.country || '—') : '—'}
          sub={topLocation?.country}
          color="amber"
        />
      </div>

      {/* ── Daily Trend ──────────────────────────── */}
      {data.daily_trend.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-gray-900">Submission Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 30 days</p>
            </div>
            <span className="text-2xl font-extrabold text-blue-600">{data.total_submissions.toLocaleString()}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.daily_trend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} fill="url(#areaGrad)" dot={false} activeDot={{ r: 5, fill: '#2563eb' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Device / Browser / OS / Location ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Device */}
        {data.device_breakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Device Types</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={data.device_breakdown}
                    dataKey="count"
                    nameKey="device_type"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {data.device_breakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Submissions']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.device_breakdown.map((d, i) => {
                  const total = data.device_breakdown.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="capitalize text-gray-700 flex-1">{d.device_type}</span>
                      <span className="font-semibold text-gray-900">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Browser */}
        {data.browser_breakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Browsers</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.browser_breakdown.slice(0, 7)} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="browser_name" type="category" tick={{ fontSize: 12, fill: '#475569' }} width={72} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [v, 'Submissions']} />
                <Bar dataKey="count" fill="#7c3aed" radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* OS */}
        {data.os_breakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Operating Systems</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.os_breakdown.slice(0, 7)} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="os_name" type="category" tick={{ fontSize: 12, fill: '#475569' }} width={72} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [v, 'Submissions']} />
                <Bar dataKey="count" fill="#db2777" radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Locations */}
        {data.location_breakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Top Locations</h3>
            <div className="space-y-2">
              {data.location_breakdown.slice(0, 8).map((loc, i) => {
                const maxVal = data.location_breakdown[0].count;
                const pct = maxVal > 0 ? (loc.count / maxVal) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm text-gray-700">
                          {loc.city ? `${loc.city}, ` : ''}{loc.country || '—'}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{loc.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Field Analytics ───────────────────────── */}
      {data.field_analytics.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Field Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {data.field_analytics.map((fa) => {
              const total = fa.distribution.reduce((s, d) => s + d.count, 0);
              const showPie = fa.distribution.length <= 6 && fa.distribution.length > 0;
              return (
                <div key={fa.field_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 text-sm">{fa.label}</h4>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                      {fa.field_type}
                    </span>
                  </div>
                  {showPie ? (
                    <div className="flex items-center gap-3">
                      <ResponsiveContainer width="45%" height={170}>
                        <PieChart>
                          <Pie
                            data={fa.distribution.map((d) => ({ name: d.answer_value || '(empty)', value: d.count }))}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={3}
                            strokeWidth={0}
                          >
                            {fa.distribution.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => [v, 'responses']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1.5">
                        {fa.distribution.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="flex-1 truncate text-gray-600">{d.answer_value || '(empty)'}</span>
                            <span className="font-semibold text-gray-800">{total > 0 ? ((d.count / total) * 100).toFixed(0) : 0}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fa.distribution.slice(0, 8).map((d, i) => {
                        const maxCount = Math.max(...fa.distribution.map((x) => x.count));
                        const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                        const totalPct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0';
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-28 truncate">{d.answer_value || '(empty)'}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-12 text-right">
                              {d.count} <span className="font-normal text-gray-400">({totalPct}%)</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Field Completion Rates ────────────────── */}
      {data.field_completion.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900">Field Completion Rates</h3>
            <span className="text-sm font-semibold text-gray-600">
              Avg: <span className="text-blue-600">{avgCompletion.toFixed(1)}%</span>
            </span>
          </div>
          <div className="space-y-4">
            {data.field_completion.map((fc) => (
              <div key={fc.field_id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-700 font-medium">
                    {fc.label}
                    {fc.is_required && <span className="text-rose-400 ml-0.5 text-xs">*</span>}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">{fc.answered}/{fc.total}</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full ${
                        fc.rate >= 90
                          ? 'bg-emerald-100 text-emerald-700'
                          : fc.rate >= 50
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {fc.rate.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      fc.rate >= 90 ? 'bg-emerald-500' : fc.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${fc.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
