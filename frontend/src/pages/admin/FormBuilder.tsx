import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as api from '../../api/endpoints';
import type { FormBuilderForm, FormBuilderField } from '../../types';
import { FIELD_TYPE_OPTIONS } from '../../types';
import ConfirmModal from '../../components/ui/ConfirmModal';

// ─── Field Type Icons (emoji-based for simplicity) ────
const FIELD_ICONS: Record<string, string> = {
  text: 'Aa', textarea: '¶', email: '@', number: '#', phone: '📞',
  password: '🔒', date: '📅', datetime: '📅', time: '🕐',
  select: '▾', radio: '◉', checkbox: '☑', multi_checkbox: '☑☑',
  file: '📎', image: '🖼', url: '🔗', hidden: '👁‍🗨',
  section_heading: 'H', description_block: '📝', rating: '⭐',
  range_slider: '◐', yes_no: '✓✗', signature: '✍', location: '📍',
};

// ─── Field Type Palette Categories ────────────────────
const PALETTE_CATEGORIES = [
  {
    name: 'Text Inputs',
    types: ['text', 'textarea', 'email', 'number', 'phone', 'password', 'url'],
  },
  {
    name: 'Choice',
    types: ['select', 'radio', 'checkbox', 'multi_checkbox', 'yes_no'],
  },
  {
    name: 'Date & Time',
    types: ['date', 'datetime', 'time'],
  },
  {
    name: 'Media',
    types: ['file', 'image', 'signature'],
  },
  {
    name: 'Interactive',
    types: ['rating', 'range_slider', 'location'],
  },
  {
    name: 'Layout',
    types: ['section_heading', 'description_block', 'hidden'],
  },
];

// ─── Field Editor Modal ───────────────────────────────
function FieldEditor({
  field,
  onSave,
  onCancel,
  saving,
}: {
  field: Partial<FormBuilderField>;
  onSave: (data: Partial<FormBuilderField>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [f, setF] = useState<Partial<FormBuilderField>>({ ...field });
  const [optionsText, setOptionsText] = useState(
    (field.options || []).map((o) => `${o.value}:${o.label}`).join('\n')
  );

  const set = (key: string, val: unknown) => setF((prev) => ({ ...prev, [key]: val }));

  const needsOptions = ['select', 'radio', 'multi_checkbox'].includes(f.field_type || '');

  const handleSave = () => {
    if (!f.label?.trim()) {
      toast.error('Label is required');
      return;
    }
    const options = needsOptions
      ? optionsText
          .split('\n')
          .filter((l) => l.trim())
          .map((line) => {
            const parts = line.split(':');
            const value = parts[0]?.trim() || '';
            const label = parts.length > 1 ? parts.slice(1).join(':').trim() : value;
            return { value, label };
          })
      : f.options || [];
    onSave({ ...f, options });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            {field.id ? 'Edit Field' : 'Add Field'}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Field Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Field Type</label>
            <select
              value={f.field_type || 'text'}
              onChange={(e) => set('field_type', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {FIELD_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Label *</label>
            <input
              type="text"
              value={f.label || ''}
              onChange={(e) => set('label', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. Full Name"
            />
          </div>

          {/* Placeholder */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
            <input
              type="text"
              value={f.placeholder || ''}
              onChange={(e) => set('placeholder', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Help Text */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Help Text</label>
            <input
              type="text"
              value={f.help_text || ''}
              onChange={(e) => set('help_text', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Default Value */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Default Value</label>
            <input
              type="text"
              value={f.default_value || ''}
              onChange={(e) => set('default_value', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Options (for select/radio/multi_checkbox) */}
          {needsOptions && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Options (one per line, format: value:label)
              </label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                placeholder={`option1:Option 1\noption2:Option 2`}
              />
            </div>
          )}

          {/* Validation: min/max length */}
          {['text', 'textarea', 'email', 'phone', 'password', 'url'].includes(f.field_type || '') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Min Length</label>
                <input
                  type="number"
                  value={f.min_length ?? ''}
                  onChange={(e) => set('min_length', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Length</label>
                <input
                  type="number"
                  value={f.max_length ?? ''}
                  onChange={(e) => set('max_length', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Validation: min/max value */}
          {['number', 'rating', 'range_slider'].includes(f.field_type || '') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Min Value</label>
                <input
                  type="number"
                  value={f.min_value ?? ''}
                  onChange={(e) => set('min_value', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Max Value</label>
                <input
                  type="number"
                  value={f.max_value ?? ''}
                  onChange={(e) => set('max_value', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={f.is_required ?? false}
                onChange={(e) => set('is_required', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={f.is_active ?? true}
                onChange={(e) => set('is_active', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Active
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : field.id ? 'Update Field' : 'Add Field'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────
export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormBuilderForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldSaving, setFieldSaving] = useState(false);

  // Form settings panel
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [unicodeText, setUnicodeText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isRedirect, setIsRedirect] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [settingsDirty, setSettingsDirty] = useState(false);

  // Field editor
  const [editingField, setEditingField] = useState<Partial<FormBuilderField> | null>(null);

  // Confirm modals
  const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null);
  const [confirmDeleteForm, setConfirmDeleteForm] = useState(false);
  const [confirmDeleting, setConfirmDeleting] = useState(false);

  // Drag reorder (within canvas)
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Drag from palette
  const [draggingType, setDraggingType] = useState<string | null>(null);
  const [canvasHighlight, setCanvasHighlight] = useState(false);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const fetchForm = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getAdminFormDetail(id);
      setForm(data);
      setTitle(data.title);
      setDescription(data.description);
      setUnicodeText(data.unicode_text);
      setIsActive(data.is_active);
      setIsRedirect(data.is_redirect);
      setRedirectUrl(data.redirect_url);
      setSettingsDirty(false);
    } catch {
      toast.error('Failed to load form');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  // Mark settings dirty on changes
  useEffect(() => {
    if (!form) return;
    const changed =
      title !== form.title ||
      description !== form.description ||
      unicodeText !== form.unicode_text ||
      isActive !== form.is_active ||
      isRedirect !== form.is_redirect ||
      redirectUrl !== form.redirect_url;
    setSettingsDirty(changed);
  }, [title, description, unicodeText, isActive, isRedirect, redirectUrl, form]);

  const handleSaveSettings = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await api.updateAdminForm(id, {
        title,
        description,
        unicode_text: unicodeText,
        is_active: isActive,
        is_redirect: isRedirect,
        redirect_url: redirectUrl,
      });
      setForm(updated);
      setSettingsDirty(false);
      toast.success('Form saved');
    } catch {
      toast.error('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveField = async (data: Partial<FormBuilderField>) => {
    if (!id) return;
    setFieldSaving(true);
    try {
      if (data.id) {
        await api.updateFormField(id, data.id, data);
      } else {
        await api.createFormField(id, data);
      }
      setEditingField(null);
      await fetchForm();
      toast.success(data.id ? 'Field updated' : 'Field added');
    } catch {
      toast.error('Failed to save field');
    } finally {
      setFieldSaving(false);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!id) return;
    setConfirmDeleting(true);
    try {
      await api.deleteFormField(id, fieldId);
      await fetchForm();
      toast.success('Field deleted');
    } catch {
      toast.error('Failed to delete field');
    } finally {
      setConfirmDeleting(false);
      setConfirmDeleteField(null);
    }
  };

  const handleDeleteForm = async () => {
    if (!id || !form) return;
    setConfirmDeleting(true);
    try {
      await api.deleteAdminForm(id);
      toast.success('Form deleted');
      navigate('/admin/surveys');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setConfirmDeleting(false);
      setConfirmDeleteForm(false);
    }
  };

  // ── Drag from palette to canvas ─────────────────────
  const handlePaletteDragStart = (fieldType: string, e: React.DragEvent) => {
    setDraggingType(fieldType);
    e.dataTransfer.setData('text/plain', fieldType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggingType ? 'copy' : 'move';
    if (draggingType) setCanvasHighlight(true);
  };

  const handleCanvasDragLeave = () => {
    setCanvasHighlight(false);
    setDropTargetIdx(null);
  };

  const handleFieldDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetIdx(idx);
  };

  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setCanvasHighlight(false);
    setDropTargetIdx(null);

    // Drop from palette → create new field
    if (draggingType) {
      const opt = FIELD_TYPE_OPTIONS.find((o) => o.value === draggingType);
      const defaultLabel = opt?.label || draggingType;
      setDraggingType(null);

      // Immediately open editor with pre-filled type so user can set label
      setEditingField({
        field_type: draggingType,
        label: defaultLabel,
        placeholder: '',
        help_text: '',
        default_value: '',
        is_required: false,
        is_active: true,
        options: [],
        min_length: null,
        max_length: null,
        min_value: null,
        max_value: null,
      });
      return;
    }

    // Drop for reorder within canvas (handled by per-field drop)
  };

  // ── Reorder within canvas ───────────────────────────
  const handleFieldDragStart = (idx: number, e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFieldDrop = async (dropIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetIdx(null);
    setCanvasHighlight(false);

    // If from palette
    if (draggingType) {
      const opt = FIELD_TYPE_OPTIONS.find((o) => o.value === draggingType);
      const defaultLabel = opt?.label || draggingType;
      setDraggingType(null);
      setEditingField({
        field_type: draggingType,
        label: defaultLabel,
        placeholder: '',
        help_text: '',
        default_value: '',
        is_required: false,
        is_active: true,
        options: [],
        min_length: null,
        max_length: null,
        min_value: null,
        max_value: null,
        sort_order: dropIdx,
      });
      return;
    }

    // Reorder
    if (dragIdx === null || dragIdx === dropIdx || !form || !id) return;
    const sorted = [...form.fields].sort((a, b) => a.sort_order - b.sort_order);
    const [moved] = sorted.splice(dragIdx, 1);
    sorted.splice(dropIdx, 0, moved);
    const reordered = sorted.map((f, i) => ({ ...f, sort_order: i }));
    setForm({ ...form, fields: reordered });
    setDragIdx(null);

    try {
      await api.bulkUpdateFormFields(
        id,
        reordered.map((f) => ({ id: f.id, sort_order: f.sort_order }))
      );
    } catch {
      toast.error('Failed to save order');
      fetchForm();
    }
  };

  const publicUrl = form ? `${window.location.origin}/f/${form.slug}` : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!form) return <p className="text-gray-500">Form not found</p>;

  const sortedFields = [...form.fields].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin/surveys" className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              All Surveys
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900">{form.title}</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Edit Mode
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${form.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${form.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {form.is_active ? 'Live' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/surveys/${id}/submissions`}
            className="px-3 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-600"
          >
            Submissions ({form.submission_count})
          </Link>
          <Link
            to={`/admin/surveys/${id}/report`}
            className="px-3 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-600"
          >
            Report
          </Link>
          <button
            onClick={() => setConfirmDeleteForm(true)}
            className="px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition"
          >
            Delete
          </button>
        </div>
      </div>

      {/* ── 3-Column Builder: Settings | Canvas | Palette ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_220px] gap-5" style={{ minHeight: 'calc(100vh - 160px)' }}>

        {/* ── LEFT: Form Settings + Share/QR (always visible) ── */}
        <div className="space-y-4">

          {/* Settings Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 flex items-center gap-2">
              <span className="text-base">⚙</span>
              <h3 className="font-semibold text-gray-800 text-sm">Form Settings</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                  placeholder="What is this form about?"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Badge / Emoji</label>
                <input
                  type="text"
                  value={unicodeText}
                  onChange={(e) => setUnicodeText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. 🔥 or NEW"
                />
              </div>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRedirect}
                    onChange={(e) => setIsRedirect(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Redirect</span>
                </label>
              </div>
              {isRedirect && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Redirect URL</label>
                  <input
                    type="url"
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="https://example.com/thank-you"
                  />
                </div>
              )}
              <button
                onClick={handleSaveSettings}
                disabled={!settingsDirty || saving}
                className="w-full mt-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : settingsDirty ? 'Save Changes' : 'Saved ✓'}
              </button>
            </div>
          </div>

          {/* Share & QR Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 flex items-center gap-2">
              <span className="text-base">🔗</span>
              <h3 className="font-semibold text-gray-800 text-sm">Share</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Public URL</label>
                <div className="flex gap-1.5">
                  <input
                    readOnly
                    value={publicUrl}
                    className="flex-1 min-w-0 px-2 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg text-gray-600 truncate"
                  />
                  <button
                    onClick={() => {
                      if (navigator.clipboard && window.isSecureContext) {
                        navigator.clipboard.writeText(publicUrl).then(() => toast.success('Copied!'));
                      } else {
                        const ta = document.createElement('textarea');
                        ta.value = publicUrl;
                        ta.style.position = 'fixed';
                        ta.style.opacity = '0';
                        document.body.appendChild(ta);
                        ta.focus();
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        toast.success('Copied!');
                      }
                    }}
                    className="px-2.5 py-1.5 text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-100 transition font-medium flex-shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
              {form.qr_code_url ? (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">QR Code</label>
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={form.qr_code_url}
                      alt="QR Code"
                      className="w-36 h-36 rounded-xl border border-gray-200 shadow-sm"
                    />
                    <a
                      href={form.qr_code_url}
                      download
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Download QR
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic">QR code not available</p>
              )}
            </div>
          </div>
        </div>

        {/* ── MIDDLE: Form Canvas ─────────────────────────── */}
        <div className="min-w-0">
          <div
            ref={canvasRef}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
            className={`bg-white rounded-xl shadow-sm border-2 transition-colors min-h-[500px] ${
              canvasHighlight
                ? 'border-blue-400 bg-blue-50/30'
                : 'border-gray-100'
            }`}
          >
            {/* Canvas header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">
                Form Fields ({sortedFields.length})
              </h3>
              <span className="text-[11px] text-gray-400">
                Drag fields from palette →
              </span>
            </div>

            {sortedFields.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-20 transition ${canvasHighlight ? 'scale-105' : ''}`}>
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm font-medium">Drag and drop fields here</p>
                <p className="text-gray-300 text-xs mt-1">or use the palette on the right</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {sortedFields.map((field, idx) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={(e) => handleFieldDragStart(idx, e)}
                    onDragOver={(e) => handleFieldDragOver(e, idx)}
                    onDrop={(e) => handleFieldDrop(idx, e)}
                    onDragEnd={() => { setDragIdx(null); setDropTargetIdx(null); }}
                    className={`group px-4 py-3 flex items-center gap-3 transition-all cursor-grab active:cursor-grabbing ${
                      dragIdx === idx
                        ? 'opacity-40 scale-[0.98]'
                        : dropTargetIdx === idx
                        ? 'border-t-2 border-blue-400'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Drag handle */}
                    <div className="text-gray-200 group-hover:text-gray-400 flex-shrink-0 transition">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
                      </svg>
                    </div>

                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">{FIELD_ICONS[field.field_type] || '?'}</span>
                    </div>

                    {/* Field info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 truncate">{field.label}</span>
                        {field.is_required && <span className="text-red-400 text-xs font-bold">*</span>}
                        {!field.is_active && <span className="text-[10px] text-gray-400 italic bg-gray-100 px-1.5 py-0.5 rounded">hidden</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          {FIELD_TYPE_OPTIONS.find((o) => o.value === field.field_type)?.label || field.field_type}
                        </span>
                        {field.placeholder && (
                          <span className="text-[11px] text-gray-300 truncate">{field.placeholder}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => setEditingField(field)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteField(field.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Field Type Palette ───────────────────── */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-4">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Components</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Drag onto canvas</p>
            </div>
            <div className="p-3 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {PALETTE_CATEGORIES.map((cat) => (
                <div key={cat.name}>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                    {cat.name}
                  </p>
                  <div className="space-y-1">
                    {cat.types.map((type) => {
                      const opt = FIELD_TYPE_OPTIONS.find((o) => o.value === type);
                      if (!opt) return null;
                      return (
                        <div
                          key={type}
                          draggable
                          onDragStart={(e) => handlePaletteDragStart(type, e)}
                          onDragEnd={() => { setDraggingType(null); setCanvasHighlight(false); }}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 cursor-grab active:cursor-grabbing active:bg-blue-50 active:border-blue-200 transition group select-none"
                        >
                          <span className="w-7 h-7 rounded-md bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center text-xs transition flex-shrink-0">
                            {FIELD_ICONS[type] || '?'}
                          </span>
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                            {opt.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile: Quick Add Button (replaces palette) ── */}
      <div className="lg:hidden fixed bottom-6 right-6 z-30">
        <button
          onClick={() => {
            setEditingField({
              field_type: 'text',
              label: '',
              placeholder: '',
              help_text: '',
              default_value: '',
              is_required: false,
              is_active: true,
              options: [],
              min_length: null,
              max_length: null,
              min_value: null,
              max_value: null,
            });
          }}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center text-2xl transition hover:scale-105"
        >
          +
        </button>
      </div>

      {/* Field Editor Modal */}
      {editingField && (
        <FieldEditor
          field={editingField}
          onSave={handleSaveField}
          onCancel={() => setEditingField(null)}
          saving={fieldSaving}
        />
      )}

      {/* Confirm Delete Field */}
      <ConfirmModal
        open={!!confirmDeleteField}
        title="Delete Field"
        message="Are you sure you want to delete this field? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={confirmDeleting}
        onConfirm={() => confirmDeleteField && handleDeleteField(confirmDeleteField)}
        onCancel={() => setConfirmDeleteField(null)}
      />

      {/* Confirm Delete Form */}
      <ConfirmModal
        open={confirmDeleteForm}
        title="Delete Form"
        message={`Delete "${form.title}"? All fields and submissions will be permanently removed.`}
        confirmLabel="Delete Form"
        variant="danger"
        loading={confirmDeleting}
        onConfirm={handleDeleteForm}
        onCancel={() => setConfirmDeleteForm(false)}
      />
    </div>
  );
}
