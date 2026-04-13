import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as api from '../../api/endpoints';
import type { FormReportData } from '../../types';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#d97706', '#6366f1'];

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">No report data available</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to={`/admin/surveys/${id}/builder`} className="text-sm text-blue-600 hover:underline">
            &larr; Back to Form
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Report: {data.form_title}
          </h1>
        </div>
        <Link
            to={`/admin/surveys/${id}/submissions`}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          View Submissions
        </Link>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Submissions</p>
          <p className="text-2xl font-bold text-gray-900">{data.total_submissions.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Fields Tracked</p>
          <p className="text-2xl font-bold text-gray-900">{data.field_completion.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Avg Completion</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.field_completion.length > 0
              ? `${(data.field_completion.reduce((s, f) => s + f.rate, 0) / data.field_completion.length).toFixed(1)}%`
              : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Top Location</p>
          <p className="text-2xl font-bold text-gray-900 truncate">
            {data.location_breakdown.length > 0
              ? data.location_breakdown[0].city || data.location_breakdown[0].country
              : '—'}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        {data.daily_trend.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trend (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.daily_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString('en-IN')} />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Device Breakdown */}
        {data.device_breakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Types</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.device_breakdown}
                  dataKey="count"
                  nameKey="device_type"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  label={({ device_type, percent }) =>
                    `${device_type} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {data.device_breakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Browser Breakdown */}
        {data.browser_breakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Browsers</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.browser_breakdown.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="browser_name" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* OS Breakdown */}
        {data.os_breakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Operating Systems</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.os_breakdown.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="os_name" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#db2777" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Location */}
        {data.location_breakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Locations</h3>
            <div className="space-y-2">
              {data.location_breakdown.slice(0, 10).map((loc, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700">
                    {loc.city}{loc.country ? `, ${loc.country}` : ''}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{loc.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Field Analytics */}
      {data.field_analytics.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Field Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.field_analytics.map((fa) => {
              const showPie = fa.distribution.length <= 6 && fa.distribution.length > 0;
              return (
                <div key={fa.field_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{fa.label}</h4>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded">
                      {fa.field_type}
                    </span>
                  </div>
                  {showPie ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={fa.distribution.map((d) => ({ name: d.answer_value || '(empty)', value: d.count }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={40}
                          outerRadius={75}
                          paddingAngle={3}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {fa.distribution.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="space-y-1.5">
                      {fa.distribution.slice(0, 8).map((d, i) => {
                        const maxCount = Math.max(...fa.distribution.map((x) => x.count));
                        const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-28 truncate">{d.answer_value || '(empty)'}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-medium text-gray-700 w-8 text-right">{d.count}</span>
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

      {/* Field Completion Rates */}
      {data.field_completion.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Field Completion Rates</h3>
          <div className="space-y-3">
            {data.field_completion.map((fc) => (
              <div key={fc.field_id} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-40 truncate">
                  {fc.label}
                  {fc.is_required && <span className="text-red-400 ml-0.5">*</span>}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      fc.rate >= 90 ? 'bg-green-500' : fc.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${fc.rate}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600 w-16 text-right">
                  {fc.rate.toFixed(1)}% ({fc.answered}/{fc.total})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
