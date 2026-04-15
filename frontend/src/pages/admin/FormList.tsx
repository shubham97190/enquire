import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as api from '../../api/endpoints';
import type { FormBuilderListItem } from '../../types';
import ConfirmModal from '../../components/ui/ConfirmModal';

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function FormList() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormBuilderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminForms();
      setForms(data);
    } catch {
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const form = await api.createAdminForm({ title: 'Untitled Survey' });
      navigate(`/admin/surveys/${form.id}/builder`);
    } catch {
      toast.error('Failed to create survey');
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const copy = await api.duplicateAdminForm(id);
      toast.success('Survey duplicated');
      setForms((prev) => [copy as unknown as FormBuilderListItem, ...prev]);
      fetchForms();
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteAdminForm(deleteTarget.id);
      toast.success('Survey deleted');
      setForms((prev) => prev.filter((f) => f.id !== deleteTarget.id));
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (form: FormBuilderListItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.updateAdminForm(form.id, { is_active: !form.is_active });
      setForms((prev) =>
        prev.map((f) => (f.id === form.id ? { ...f, is_active: !f.is_active } : f))
      );
      toast.success(form.is_active ? 'Survey deactivated' : 'Survey activated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const filtered = forms.filter((f) => {
    const matchSearch =
      !search ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && f.is_active) ||
      (filterStatus === 'inactive' && !f.is_active);
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Surveys</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {forms.length} survey{forms.length !== 1 ? 's' : ''} · {forms.filter((f) => f.is_active).length} active
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm shadow-blue-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Survey
        </button>
      </div>

      {/* ── Search & Filter ───────────────────── */}
      {forms.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search surveys…"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition capitalize ${
                  filterStatus === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────── */}
      {forms.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No surveys yet</h3>
          <p className="text-sm text-gray-500 mb-5">Create your first survey to start collecting responses.</p>
          <button
            onClick={handleCreate}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
          >
            Create First Survey
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-gray-500 text-sm">No surveys match your search.</p>
          <button onClick={() => { setSearch(''); setFilterStatus('all'); }} className="mt-2 text-sm text-blue-600 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((form) => (
            <div key={form.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition group flex flex-col">
              {/* Card top */}
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-sm leading-snug">{form.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">/{form.slug}</p>
                  </div>
                  <button onClick={(e) => handleToggleActive(form, e)}>
                    <StatusBadge active={form.is_active} />
                  </button>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                    </svg>
                    <span>{form.field_count} fields</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    <span className="font-semibold text-gray-700">{form.submission_count}</span>
                    <span>responses</span>
                  </div>
                  <span className="ml-auto text-[10px] text-gray-400">
                    {new Date(form.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </span>
                </div>

                {form.is_redirect && form.redirect_url && (
                  <p className="text-xs text-blue-500 mt-2 truncate flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    {form.redirect_url}
                  </p>
                )}
              </div>

              {/* Action row */}
              <div className="border-t border-gray-50 px-5 py-3 flex items-center gap-1 flex-wrap">
                <Link
                  to={`/admin/surveys/${form.id}/builder`}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                  Edit
                </Link>
                <Link
                  to={`/admin/surveys/${form.id}/submissions`}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  Responses
                </Link>
                <Link
                  to={`/admin/surveys/${form.id}/report`}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-violet-600 hover:bg-violet-50 rounded-lg transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  Report
                </Link>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={(e) => handleDuplicate(form.id, e)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 rounded-lg transition"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => handleDelete(form.id, form.title, e)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Survey"
        message={`Delete "${deleteTarget?.title}"? All fields and submissions will be permanently removed.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
