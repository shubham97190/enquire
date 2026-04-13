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

// ─── Submission Detail Modal ──────────────────────────
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-gray-900">Submission Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : !detail ? (
          <div className="p-6 text-gray-500">Not found</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Answers */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Answers</h4>
              <div className="space-y-2">
                {detail.answers.map((a) => (
                  <div key={a.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500">{a.question_label_snapshot}</p>
                    <div className="mt-0.5">
                      <AnswerDisplay type={a.question_type_snapshot} value={a.answer_value} json={a.answer_json} />
                    </div>
                  </div>
                ))}
                {detail.answers.length === 0 && (
                  <p className="text-sm text-gray-400">No answers recorded</p>
                )}
              </div>
            </div>

            {/* Device & Location */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Device Info</h4>
                <div className="space-y-1 text-gray-600">
                  <p>Type: <strong>{detail.device_type}</strong></p>
                  <p>Browser: <strong>{detail.browser_name}</strong></p>
                  <p>OS: <strong>{detail.os_name}</strong></p>
                  <p>Brand: <strong>{detail.device_brand || '—'}</strong></p>
                  <p>Mobile: {detail.is_mobile ? '✓' : '✗'} | Tablet: {detail.is_tablet ? '✓' : '✗'} | Desktop: {detail.is_desktop ? '✓' : '✗'}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Location</h4>
                <div className="space-y-1 text-gray-600">
                  <p>IP: <strong>{detail.ip_address || '—'}</strong></p>
                  <p>City: <strong>{detail.city || '—'}</strong></p>
                  <p>Region: <strong>{detail.region || '—'}</strong></p>
                  <p>Country: <strong>{detail.country || '—'}</strong></p>
                  <p>Timezone: <strong>{detail.timezone || '—'}</strong></p>
                  <p>ISP: <strong>{detail.org || '—'}</strong></p>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="text-xs text-gray-400">
              <p>Submitted: {new Date(detail.submitted_at).toLocaleString('en-IN')}</p>
              <p>User Agent: {detail.user_agent || '—'}</p>
            </div>
          </div>
        )}
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
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Device</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Browser</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => setSelectedSub(sub.id)}
                  >
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {new Date(sub.submitted_at).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {sub.ip_address || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {[sub.city, sub.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        sub.is_mobile ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {sub.device_type || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{sub.browser_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        sub.status === 'reviewed'
                          ? 'bg-green-100 text-green-700'
                          : sub.status === 'archived'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-xs text-blue-600 hover:underline">
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
