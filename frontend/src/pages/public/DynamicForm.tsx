import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { deviceDetect, isMobile, isTablet, isChrome, isEdge, isAndroid } from 'react-device-detect';
import * as api from '../../api/endpoints';
import type { FormBuilderForm, FormBuilderField } from '../../types';
import PhoneInput from '../../components/ui/PhoneInput';

// ─── Field Label ──────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-semibold tracking-widest text-gray-500 uppercase mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

// ─── Star Rating ──────────────────────────────────────
function StarRating({ value, onChange, max = 5 }: { value: number; onChange: (v: number) => void; max?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          onMouseEnter={() => setHover(i + 1)}
          onMouseLeave={() => setHover(0)}
          className={`text-2xl transition-transform hover:scale-110 ${
            i < (hover || value) ? 'text-yellow-400' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <span className="text-sm text-gray-500 ml-2 self-center">{value}/{max}</span>
      )}
    </div>
  );
}

// ─── Signature Pad ────────────────────────────────────
function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  const startDraw = (x: number, y: number) => {
    drawing.current = true;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (x: number, y: number) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    if (drawing.current && canvasRef.current) {
      drawing.current = false;
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const t = e.touches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  useEffect(() => {
    if (value && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = value;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="w-full border border-gray-200 rounded-xl bg-white cursor-crosshair touch-none"
        style={{ maxWidth: 400, height: 150 }}
        onMouseDown={(e) => { const p = getPos(e); startDraw(p.x, p.y); }}
        onMouseMove={(e) => { const p = getPos(e); draw(p.x, p.y); }}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={(e) => { e.preventDefault(); const p = getTouchPos(e); startDraw(p.x, p.y); }}
        onTouchMove={(e) => { e.preventDefault(); const p = getTouchPos(e); draw(p.x, p.y); }}
        onTouchEnd={stopDraw}
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-[11px] text-gray-400">Draw your signature above</p>
        <button type="button" onClick={clear} className="text-xs text-red-500 hover:text-red-700 transition">
          Clear
        </button>
      </div>
    </div>
  );
}

// ─── File/Image Upload ────────────────────────────────
function FileUpload({
  field,
  value,
  onChange,
  accept,
  showPreview,
}: {
  field: FormBuilderField;
  value: string;
  onChange: (v: string) => void;
  accept?: string;
  showPreview?: boolean;
}) {
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onChange(result);
      if (showPreview && file.type.startsWith('image/')) setPreview(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} onChange={handleFileChange} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-gray-200 rounded-xl px-4 py-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-32 mx-auto rounded-lg mb-2" />
        ) : (
          <div className="text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
        )}
        <p className="text-sm text-gray-600">
          {fileName || (field.placeholder || `Click to upload ${showPreview ? 'image' : 'file'}`)}
        </p>
        {value && !preview && <p className="text-xs text-green-600 mt-1">File selected ✓</p>}
      </button>
    </div>
  );
}

// ─── Dynamic Field Renderer ───────────────────────────
function DynamicField({
  field,
  value,
  error,
  onChange,
}: {
  field: FormBuilderField;
  value: string;
  error?: string;
  onChange: (val: string) => void;
}) {
  const baseCls =
    'w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition placeholder:text-gray-300';
  const cls = `${baseCls} ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`;
  const [showPassword, setShowPassword] = useState(false);

  switch (field.field_type) {
    case 'section_heading':
      return (
        <div className="pt-4 pb-1">
          <h3 className="text-base font-bold text-gray-800">{field.label}</h3>
          {field.help_text && (
            <p className="text-xs text-gray-400 mt-0.5">{field.help_text}</p>
          )}
        </div>
      );

    case 'description_block':
      return (
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-blue-800">{field.help_text || field.label}</p>
        </div>
      );

    case 'textarea':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className={cls}
            placeholder={field.placeholder}
          />
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'select':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <div className="relative">
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`${cls} appearance-none pr-9`}
            >
              <option value="">{field.placeholder || 'Select an option'}</option>
              {(field.options || []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'radio':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <div className="space-y-2 mt-1">
            {(field.options || []).map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'checkbox':
      return (
        <div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => onChange(e.target.checked ? 'true' : '')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">{field.label}</span>
            {field.is_required && <span className="text-red-400">*</span>}
          </label>
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1 ml-6">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1 ml-6">{error}</p>}
        </div>
      );

    case 'multi_checkbox':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <div className="space-y-2 mt-1">
            {(field.options || []).map((opt) => {
              const selected = value ? value.split(',') : [];
              const isChecked = selected.includes(opt.value);
              return (
                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const next = isChecked
                        ? selected.filter((v) => v !== opt.value)
                        : [...selected, opt.value];
                      onChange(next.join(','));
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{opt.label}</span>
                </label>
              );
            })}
          </div>
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'yes_no':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <div className="flex gap-3 mt-1">
            {['yes', 'no'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition border ${
                  value === opt
                    ? opt === 'yes'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {opt === 'yes' ? '✓ Yes' : '✗ No'}
              </button>
            ))}
          </div>
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'rating':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <StarRating
            value={value ? parseInt(value) : 0}
            onChange={(v) => onChange(String(v))}
            max={field.max_value || 5}
          />
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'range_slider':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-8 text-right">{field.min_value ?? 0}</span>
            <input
              type="range"
              min={field.min_value ?? 0}
              max={field.max_value ?? 100}
              value={value || field.min_value || 0}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 accent-blue-600 h-2"
            />
            <span className="text-xs text-gray-400 w-8">{field.max_value ?? 100}</span>
          </div>
          <div className="text-center mt-1">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full">
              {value || field.min_value || 0}
            </span>
          </div>
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'hidden':
      return <input type="hidden" value={field.default_value || ''} />;

    case 'phone':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <PhoneInput value={value} onChange={onChange} placeholder={field.placeholder} error={!!error} />
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'password':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`${cls} pr-10`}
              placeholder={field.placeholder}
              minLength={field.min_length ?? undefined}
              maxLength={field.max_length ?? undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'file':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <FileUpload field={field} value={value} onChange={onChange} />
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'image':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <FileUpload field={field} value={value} onChange={onChange} accept="image/*" showPreview />
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'signature':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <SignaturePad value={value} onChange={onChange} />
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'location':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <div className="space-y-2">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={cls}
              placeholder={field.placeholder || 'Address or lat, lng'}
            />
            <button
              type="button"
              onClick={() => {
                if ('geolocation' in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => onChange(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`),
                    () => toast.error('Could not get location')
                  );
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              Use my current location
            </button>
          </div>
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'date':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'datetime':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'time':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'email':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <input
            type="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cls}
            placeholder={field.placeholder || 'name@example.com'}
            minLength={field.min_length ?? undefined}
            maxLength={field.max_length ?? undefined}
          />
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'url':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cls}
            placeholder={field.placeholder || 'https://'}
            minLength={field.min_length ?? undefined}
            maxLength={field.max_length ?? undefined}
          />
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    case 'number':
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cls}
            placeholder={field.placeholder}
            min={field.min_value ?? undefined}
            max={field.max_value ?? undefined}
          />
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );

    default:
      return (
        <div>
          <FieldLabel required={field.is_required}>{field.label}</FieldLabel>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cls}
            placeholder={field.placeholder}
            minLength={field.min_length ?? undefined}
            maxLength={field.max_length ?? undefined}
          />
          {field.help_text && <p className="text-[11px] text-gray-400 mt-1">{field.help_text}</p>}
          {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
        </div>
      );
  }
}

// ─── Main Component ───────────────────────────────────
export default function DynamicForm() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormBuilderForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inactive, setInactive] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!slug) return;
    api
      .getPublicForm(slug)
      .then((data) => {
        setForm(data);
        // Set defaults
        const defaults: Record<string, string> = {};
        data.fields.forEach((f) => {
          if (f.default_value) defaults[f.id] = f.default_value;
        });
        setValues(defaults);
      })
      .catch((err) => {
        if (err.response?.status === 403 && err.response?.data?.is_inactive) {
          setInactive(true);
        } else {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleChange = (fieldId: string, val: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: val }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    if (!form) return false;
    const errs: Record<string, string> = {};
    const nonInputTypes = new Set(['section_heading', 'description_block', 'hidden']);

    form.fields.forEach((f) => {
      if (!f.is_active || nonInputTypes.has(f.field_type)) return;
      const val = (values[f.id] || '').trim();

      if (f.is_required && !val) {
        errs[f.id] = `${f.label} is required`;
        return;
      }
      if (!val) return;

      if (f.field_type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errs[f.id] = 'Valid email required';
      }
      if (f.field_type === 'phone' && !/^\+?\d{7,15}$/.test(val.replace(/[\s\-()]/g, ''))) {
        errs[f.id] = 'Valid phone number required';
      }
      if (f.field_type === 'url' && !/^https?:\/\/.+/.test(val)) {
        errs[f.id] = 'Valid URL required (start with http:// or https://)';
      }
      if (f.min_length && val.length < f.min_length) {
        errs[f.id] = `Min ${f.min_length} characters`;
      }
      if (f.max_length && val.length > f.max_length) {
        errs[f.id] = `Max ${f.max_length} characters`;
      }
      if (f.field_type === 'number' || f.field_type === 'range_slider') {
        const num = Number(val);
        if (isNaN(num)) {
          errs[f.id] = 'Must be a number';
        } else {
          if (f.min_value !== null && f.min_value !== undefined && num < f.min_value) {
            errs[f.id] = `Min value: ${f.min_value}`;
          }
          if (f.max_value !== null && f.max_value !== undefined && num > f.max_value) {
            errs[f.id] = `Max value: ${f.max_value}`;
          }
        }
      }
    });

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !form || !validate()) return;

    setSubmitting(true);
    try {
      // ── Device info via react-device-detect ──────────────────
      const detected = deviceDetect(navigator.userAgent);
      const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
      const deviceInfo: Record<string, unknown> = {
        ...detected,
        device_type: deviceType,
        is_mobile: isMobile,
        is_tablet: isTablet,
        is_desktop: !isMobile && !isTablet,
        is_android: isAndroid,
        is_chrome: isChrome,
        is_edge: isEdge,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        language: navigator.language,
      };

      // ── Location via ipinfo.io ───────────────────────────────
      let locationInfo: Record<string, unknown> = {};
      try {
        const token = (import.meta as unknown as { env: Record<string, string> }).env.VITE_IPINFO_TOKEN;
        const url = token
          ? `https://ipinfo.io?token=${token}`
          : 'https://ipinfo.io/json';
        const { data } = await axios.get(url, { timeout: 5000 });
        locationInfo = {
          ip: data.ip ?? '',
          city: data.city ?? '',
          region: data.region ?? '',
          country: data.country ?? '',
          loc: data.loc ?? '',
          org: data.org ?? '',
          postal: data.postal ?? '',
          timezone: data.timezone ?? '',
        };
      } catch {
        // silently fail — submission continues without location
      }

      const result = await api.submitPublicForm(slug, {
        answers: values,
        device_info: deviceInfo,
        location_info: locationInfo,
      });

      navigate(`/f/${slug}/thank-you`, {
        state: {
          formTitle: form.title,
          isRedirect: result.is_redirect,
          redirectUrl: result.redirect_url,
          submissionId: result.submission_id,
        },
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, unknown> } };
      if (axiosErr.response?.data && typeof axiosErr.response.data === 'object') {
        const fieldErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(axiosErr.response.data)) {
          fieldErrors[key] = Array.isArray(val) ? val[0] : String(val);
        }
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else {
          toast.error('Submission failed. Please try again.');
        }
      } else {
        toast.error('Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Form Not Found</h2>
          <p className="text-gray-500 text-sm">This form doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (inactive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Form Inactive</h2>
          <p className="text-gray-500 text-sm">This form is currently not accepting submissions.</p>
        </div>
      </div>
    );
  }

  if (!form) return null;

  const activeFields = form.fields.filter((f) => f.is_active).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Mobile-first form layout ─────────────────────── */}
      <div className="max-w-lg mx-auto px-4 py-6 sm:py-12">
        {/* Logo / Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-3">
            <span className="text-white font-bold text-lg">E</span>
          </div>
        </div>

        {/* Badge */}
        {form.unicode_text && (
          <div className="text-center mb-3">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-widest rounded-full">
              {form.unicode_text}
            </span>
          </div>
        )}

        {/* Title & Description */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
              {form.description}
            </p>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Accent bar */}
          <div className="h-1 bg-blue-600" />

          <form onSubmit={handleSubmit} className="px-5 sm:px-7 py-6 space-y-5" noValidate>
            {activeFields.map((field) => (
              <div key={field.id} id={`field-${field.id}`}>
                <DynamicField
                  field={field}
                  value={values[field.id] || ''}
                  error={errors[field.id]}
                  onChange={(val) => handleChange(field.id, val)}
                />
              </div>
            ))}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 transition disabled:opacity-50 text-sm"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-400 mt-6">
          Powered by Enquire
        </p>
      </div>
    </div>
  );
}
