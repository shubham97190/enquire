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

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

// ── KPI Card ─────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  icon,
  gradient,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}>
      <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-1 -top-6 w-16 h-16 rounded-full bg-white/5" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">{label}</span>
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">{icon}</div>
        </div>
        <p className="text-3xl font-black tracking-tight">{value}</p>
        {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 bg-gradient-to-r from-slate-50 to-white">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2 text-xs">
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
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600" />
        <p className="text-sm text-gray-400">Loading analytics…</p>
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
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link
            to={`/admin/surveys/${id}/builder`}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mb-2 font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Builder
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{data.form_title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">Detailed Analytics</span>
            <span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
        <Link
          to={`/admin/surveys/${id}/submissions`}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          View Submissions
        </Link>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label="Total Submissions"
          value={data.total_submissions.toLocaleString()}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          icon={<svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>}
        />
        <KpiCard
          label="Fields Tracked"
          value={data.field_completion.length}
          sub="active input fields"
          gradient="bg-gradient-to-br from-violet-500 to-violet-700"
          icon={<svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>}
        />
        <KpiCard
          label="Avg Completion"
          value={`${avgCompletion.toFixed(1)}%`}
          sub="across all fields"
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
          icon={<svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard
          label="Top Location"
          value={topLocation ? (topLocation.city || topLocation.country || '—') : '—'}
          sub={topLocation?.country || 'No location data'}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          icon={<svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>}
        />
      </div>

      {/* ── Submission Trend ──────────────────────────────────────── */}
      {data.daily_trend.length > 0 && (
        <Section title="Submission Trend" subtitle="Daily responses over the last 30 days">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-500">Daily submissions</span>
            </div>
            <span className="text-2xl font-extrabold text-blue-600">{data.total_submissions.toLocaleString()} total</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.daily_trend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="reportAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#reportAreaGrad)" dot={false} activeDot={{ r: 5, fill: '#3b82f6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* ── Device / Browser / OS / Location ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Device */}
        {data.device_breakdown.length > 0 && (
          <Section title="Device Types" subtitle="Submissions by device category">
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="45%" height={200}>
                <PieChart>
                  <Pie
                    data={data.device_breakdown}
                    dataKey="count"
                    nameKey="device_type"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {data.device_breakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Submissions']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {data.device_breakdown.map((d, i) => {
                  const total = data.device_breakdown.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="capitalize text-gray-700">{d.device_type}</span>
                        </div>
                        <span className="font-bold text-gray-900">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        )}

        {/* Browser */}
        {data.browser_breakdown.length > 0 && (
          <Section title="Browsers" subtitle="Top browsers used by respondents">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.browser_breakdown.slice(0, 7)} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="browser_name" type="category" tick={{ fontSize: 12, fill: '#475569' }} width={76} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [v, 'Submissions']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
                  {data.browser_breakdown.slice(0, 7).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* OS */}
        {data.os_breakdown.length > 0 && (
          <Section title="Operating Systems" subtitle="OS distribution of respondents">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.os_breakdown.slice(0, 7)} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="os_name" type="category" tick={{ fontSize: 12, fill: '#475569' }} width={76} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [v, 'Submissions']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
                  {data.os_breakdown.slice(0, 7).map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* Top Locations */}
        {data.location_breakdown.length > 0 && (
          <Section title="Top Locations" subtitle="Geographic distribution of respondents">
            <div className="space-y-3">
              {data.location_breakdown.slice(0, 8).map((loc, i) => {
                const maxVal = data.location_breakdown[0].count;
                const pct = maxVal > 0 ? (loc.count / maxVal) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-5 text-right">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700 font-medium">
                          {loc.city ? `${loc.city}, ` : ''}{loc.country || '—'}
                        </span>
                        <span className="text-sm font-bold text-gray-900">{loc.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </div>

      {/* ── Field Analytics ────────────────────────────────────────── */}
      {data.field_analytics.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-gray-900">Field Analytics</h2>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
              {data.field_analytics.length} fields
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {data.field_analytics.map((fa, fi) => {
              const total = fa.distribution.reduce((s, d) => s + d.count, 0);
              const showPie = fa.distribution.length <= 6 && fa.distribution.length > 0;
              const fieldColor = COLORS[fi % COLORS.length];
              return (
                <div key={fa.field_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50" style={{ borderLeftColor: fieldColor, borderLeftWidth: 3 }}>
                    <h4 className="font-semibold text-gray-900 text-sm truncate pr-3">{fa.label}</h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                        {fa.field_type}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-500">{total} resp.</span>
                    </div>
                  </div>
                  <div className="p-5">
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
                            <Tooltip formatter={(v: number) => [v, 'responses']} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2">
                          {fa.distribution.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="flex-1 truncate text-gray-600">{d.answer_value || '(empty)'}</span>
                              <span className="font-bold text-gray-800">{total > 0 ? ((d.count / total) * 100).toFixed(0) : 0}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {fa.distribution.slice(0, 8).map((d, i) => {
                          const maxCount = Math.max(...fa.distribution.map((x) => x.count));
                          const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                          const totalPct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0';
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 w-28 truncate">{d.answer_value || '(empty)'}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-700 w-16 text-right">
                                {d.count} <span className="font-normal text-gray-400">({totalPct}%)</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Field Completion Rates ─────────────────────────────────── */}
      {data.field_completion.length > 0 && (
        <Section
          title="Field Completion Rates"
          subtitle={`Average: ${avgCompletion.toFixed(1)}% across ${data.field_completion.length} fields`}
        >
          <div className="space-y-4">
            {data.field_completion.map((fc, i) => {
              const rateColor =
                fc.rate >= 90 ? '#10b981' : fc.rate >= 50 ? '#f59e0b' : '#ef4444';
              const rateBg =
                fc.rate >= 90 ? 'bg-emerald-50 text-emerald-700' : fc.rate >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';
              return (
                <div key={fc.field_id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-sm text-gray-700 font-medium">
                        {fc.label}
                        {fc.is_required && <span className="text-rose-400 ml-1 text-xs">required</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400">{fc.answered}/{fc.total}</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${rateBg}`}>
                        {fc.rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${fc.rate}%`, background: rateColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Summary legend */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-50 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />≥90% excellent</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />50–90% moderate</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" />&lt;50% low</span>
          </div>
        </Section>
      )}
    </div>
  );
}
