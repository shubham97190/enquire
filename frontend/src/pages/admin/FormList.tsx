import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as api from '../../api/endpoints';
import type { FormBuilderListItem } from '../../types';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function FormList() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormBuilderListItem[]>([]);
  const [loading, setLoading] = useState(true);
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
      toast.success('Form duplicated');
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
      toast.success('Form deleted');
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
      toast.success(form.is_active ? 'Form deactivated' : 'Form activated');
    } catch {
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Surveys</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          + New Survey
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-400 mb-4">No surveys created yet.</p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Create Your First Survey
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {forms.map((form) => (
            <Link
              key={form.id}
              to={`/admin/surveys/${form.id}/builder`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{form.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">/{form.slug}</p>
                </div>
                <button
                  onClick={(e) => handleToggleActive(form, e)}
                  className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                    form.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {form.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span>{form.field_count} fields</span>
                <span>{form.submission_count} submissions</span>
                <span>{new Date(form.created_at).toLocaleDateString('en-IN')}</span>
              </div>

              {form.is_redirect && form.redirect_url && (
                <p className="text-xs text-blue-500 mb-3 truncate">
                  Redirects to: {form.redirect_url}
                </p>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                <Link
                  to={`/admin/surveys/${form.id}/builder`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Edit
                </Link>
                <span className="text-gray-200">|</span>
                <Link
                  to={`/admin/surveys/${form.id}/submissions`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Responses
                </Link>
                <span className="text-gray-200">|</span>
                <Link
                  to={`/admin/surveys/${form.id}/report`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Report
                </Link>
                <span className="text-gray-200">|</span>
                <button
                  onClick={(e) => handleDuplicate(form.id, e)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Duplicate
                </button>
                <span className="text-gray-200">|</span>
                <button
                  onClick={(e) => handleDelete(form.id, form.title, e)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </Link>
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
