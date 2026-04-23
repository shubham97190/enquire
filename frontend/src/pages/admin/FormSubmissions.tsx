import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as api from '../../api/endpoints';
import type {
  FormSubmissionListItem,
  FormSubmissionDetail as SubmissionDetailType,
  PaginatedResponse,
} from '../../types';

// ─── Type-Aware Answer Display ────────────────────────
function AnswerDisplay({ type, value, json }: { type: string; value: string; json: unknown }) {
  if (!value && !json) return <span className="text-sm text-gray-400">—</span>;

  switch (type) {
    case 'rating': {
      const num = parseInt(value) || 0;
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`text-lg ${i < num ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
          ))}
          <span className="text-sm text-gray-600 ml-1">{value}/5</span>
        </div>
      );
    }
    case 'yes_no':
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
          value === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {value === 'yes' ? '✓ Yes' : '✗ No'}
        </span>
      );
    case 'multi_checkbox':
      return (
        <div className="flex flex-wrap gap-1">
          {value.split(',').filter(Boolean).map((v, i) => (
            <span key={i} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{v.trim()}</span>
          ))}
        </div>
      );
    case 'image':
    case 'signature':
      return value.startsWith('data:image') ? (
        <img src={value} alt="Uploaded" className="max-h-24 rounded-lg border border-gray-200" />
      ) : (
        <p className="text-sm text-gray-900">{value}</p>
      );
    case 'file':
      return value.startsWith('data:') ? (
        <span className="text-sm text-green-600">File uploaded ✓</span>
      ) : (
        <p className="text-sm text-gray-900">{value}</p>
      );
    case 'url':
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
          {value}
        </a>
      );
    case 'range_slider':
      return (
        <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full">{value}</span>
      );
    default:
      return <p className="text-sm text-gray-900">{value || (json ? JSON.stringify(json) : '—')}</p>;
  }
}

function SubmissionModal({
  formId,
  subId,
  onClose,
}: {
  formId: string;
  subId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<SubmissionDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getFormSubmissionDetail(formId, subId)
      .then(setDetail)
      .catch(() => toast.error('Failed to load submission'))
      .finally(() => setLoading(false));
  }, [formId, subId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10 sticky top-0">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Submission Details</h3>
            <p className="text-xs text-gray-500 mt-0.5">Response ID: {subId.slice(0,8)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-48 space-y-4 flex-col">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-500 font-medium">Loading details...</p>
            </div>
          ) : !detail ? (
            <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm mt-8">
              Not found
            </div>
          ) : (
            <div className="space-y-6">
              {/* User Overview Card */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                
                <div className="relative z-10 flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner border border-white/20 text-white font-bold text-xl">
                    {detail.ip_address?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{detail.ip_address || 'Anonymous Respondent'}</h4>
                    <p className="text-blue-100 text-sm flex items-center gap-1.5 mt-0.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      {[detail.city, detail.country].filter(Boolean).join(', ') || 'Unknown Location'}
                    </p>
                  </div>
                </div>
                
                <div className="relative z-10 grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/20 text-sm">
                  <div>
                    <span className="block text-blue-200 text-xs mb-1 font-medium">Device & OS</span>
                    <span className="font-semibold block">{detail.device_type} · {detail.os_name}</span>
                  </div>
                  <div>
                    <span className="block text-blue-200 text-xs mb-1 font-medium">Browser</span>
                    <span className="font-semibold block">{detail.browser_name}</span>
                  </div>
                </div>
              </div>

              {/* Answers */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Responses</h4>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{detail.answers.length} answers</span>
                </div>
                <div className="p-2 space-y-1">
                  {detail.answers.map((a, i) => (
                    <div key={a.id} className="group hover:bg-slate-50 rounded-xl p-4 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800 mb-2">{a.question_label_snapshot}</p>
                          <div className="text-gray-900">
                            <AnswerDisplay type={a.question_type_snapshot} value={a.answer_value} json={a.answer_json} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {detail.answers.length === 0 && (
                    <p className="text-sm text-gray-400 p-4 text-center">No answers recorded for this submission.</p>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-gray-400 px-2 pb-4 pt-2">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {new Date(detail.submitted_at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────
export default function FormSubmissions() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PaginatedResponse<FormSubmissionListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, [id, page]);

  const fetchSubmissions = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await api.getFormSubmissions(id, { page: String(page) });
      setData(result);
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const blob = await api.exportFormSubmissions(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions_export.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const totalPages = data ? Math.ceil(data.count / 20) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to={`/admin/surveys/${id}/builder`} className="text-sm text-blue-600 hover:underline">
            &larr; Back to Form
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Submissions</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/surveys/${id}/report`}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Report
          </Link>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
          >
            Export XLSX
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No submissions yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 uppercase tracking-wider text-xs">
                  <th className="text-left px-5 py-4 font-semibold text-slate-500 rounded-tl-xl">Date & Time</th>
                  <th className="text-left px-5 py-4 font-semibold text-slate-500">Submitter Info</th>
                  <th className="text-left px-5 py-4 font-semibold text-slate-500">Device Insights</th>
                  <th className="text-left px-5 py-4 font-semibold text-slate-500">Status</th>
                  <th className="text-center px-5 py-4 font-semibold text-slate-500 rounded-tr-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.results.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-blue-50/50 cursor-pointer transition-all duration-200 group"
                    onClick={() => setSelectedSub(sub.id)}
                  >
                    <td className="px-5 py-4 text-gray-600 text-sm whitespace-nowrap">
                      <span className="font-medium text-slate-800 block">
                        {new Date(sub.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(sub.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          {sub.ip_address?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-mono text-xs text-slate-700">{sub.ip_address || 'Unknown IP'}</p>
                          <p className="text-xs text-slate-500">{[sub.city, sub.country].filter(Boolean).join(', ') || 'Unknown Location'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap max-w-[200px]">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          sub.is_mobile ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {sub.device_type || 'Unknown'}
                        </span>
                        <span className="text-xs text-slate-500 truncate max-w-[100px]">{sub.browser_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        sub.status === 'reviewed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : sub.status === 'archived'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          sub.status === 'reviewed' ? 'bg-emerald-500' : sub.status === 'archived' ? 'bg-slate-400' : 'bg-amber-500'
                        }`} />
                        <span className="capitalize">{sub.status}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button className="text-sm font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.count)} of {data.count}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!data.previous}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!data.next}
                className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSub && id && (
        <SubmissionModal
          formId={id}
          subId={selectedSub}
          onClose={() => setSelectedSub(null)}
        />
      )}
    </div>
  );
}
