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
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      {children}
      {required && <span className="text-rose-500 ml-1">*</span>}
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
    'w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder:text-gray-400 bg-white';
  const cls = `${baseCls} ${error ? 'border-red-400 bg-red-50/60 focus:ring-red-400/20 focus:border-red-400' : 'border-gray-200 hover:border-gray-300'}`;
  const [showPassword, setShowPassword] = useState(false);

  switch (field.field_type) {
    case 'section_heading':
      return (
        <div className="pt-2 pb-1 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{field.label}</h3>
          {field.help_text && (
            <p className="text-xs text-gray-500 mt-1">{field.help_text}</p>
          )}
        </div>
      );

    case 'description_block':
      return (
        <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800 leading-relaxed">{field.help_text || field.label}</p>
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
              <label
                key={opt.value}
                className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition ${
                  value === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  value === opt.value ? 'border-blue-500' : 'border-gray-300'
                }`}>
                  {value === opt.value && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
                <input type="radio" name={field.id} checked={value === opt.value} onChange={() => onChange(opt.value)} className="sr-only" />
                <span className="text-sm font-medium">{opt.label}</span>
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
          <label className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition ${
            value === 'true' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}>
            <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition ${
              value === 'true' ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
            }`}>
              {value === 'true' && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange(e.target.checked ? 'true' : '')} className="sr-only" />
            <span className="text-sm font-medium text-gray-700">{field.label}</span>
            {field.is_required && <span className="text-rose-500 ml-0.5">*</span>}
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
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-xl cursor-pointer transition ${
                    isChecked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition ${
                    isChecked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}>
                    {isChecked && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input type="checkbox" checked={isChecked} onChange={() => {
                    const next = isChecked ? selected.filter((v) => v !== opt.value) : [...selected, opt.value];
                    onChange(next.join(','));
                  }} className="sr-only" />
                  <span className="text-sm font-medium text-gray-700">{opt.label}</span>
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
            <button
              type="button"
              onClick={() => onChange('yes')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition border-2 ${
                value === 'yes'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Yes
            </button>
            <button
              type="button"
              onClick={() => onChange('no')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition border-2 ${
                value === 'no'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-100'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-rose-400 hover:text-rose-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              No
            </button>
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

  // Paged navigation
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (!slug) return;
    api
      .getPublicForm(slug)
      .then((data) => {
        setForm(data);
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

  const nonInputTypes = new Set(['section_heading', 'description_block', 'hidden']);

  // Group active fields into pages split by section_heading
  const pages = (() => {
    if (!form) return [];
    const active = form.fields.filter((f) => f.is_active).sort((a, b) => a.sort_order - b.sort_order);
    const groups: FormBuilderField[][] = [];
    let current: FormBuilderField[] = [];
    for (const field of active) {
      if (field.field_type === 'section_heading' && current.length > 0) {
        groups.push(current);
        current = [field];
      } else {
        current.push(field);
      }
    }
    if (current.length > 0) groups.push(current);
    // If no section headings at all, keep single page
    return groups.length === 0 ? [active] : groups;
  })();

  const totalPages = pages.length;
  const currentFields = pages[currentPage] ?? [];
  const isLastPage = currentPage === totalPages - 1;
  const progress = totalPages > 1 ? ((currentPage + 1) / totalPages) * 100 : 100;

  const validatePage = (pageIndex: number): boolean => {
    if (!form) return false;
    const errs: Record<string, string> = {};
    const fields = pages[pageIndex] ?? [];

    fields.forEach((f) => {
      if (nonInputTypes.has(f.field_type)) return;
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
        errs[f.id] = 'Valid URL required (must start with http:// or https://)';
      }
      if (f.min_length && val.length < f.min_length) errs[f.id] = `Minimum ${f.min_length} characters`;
      if (f.max_length && val.length > f.max_length) errs[f.id] = `Maximum ${f.max_length} characters`;
      if (f.field_type === 'number' || f.field_type === 'range_slider') {
        const num = Number(val);
        if (isNaN(num)) { errs[f.id] = 'Must be a number'; }
        else {
          if (f.min_value != null && num < f.min_value) errs[f.id] = `Minimum value: ${f.min_value}`;
          if (f.max_value != null && num > f.max_value) errs[f.id] = `Maximum value: ${f.max_value}`;
        }
      }
    });

    setErrors((prev) => ({ ...prev, ...errs }));
    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validatePage(currentPage)) return;
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentPage((p) => Math.max(p - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !form) return;
    if (!validatePage(currentPage)) return;

    setSubmitting(true);
    try {
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

      let locationInfo: Record<string, unknown> = {};
      try {
        const token = (import.meta as unknown as { env: Record<string, string> }).env.VITE_IPINFO_TOKEN;
        const url = token ? `https://ipinfo.io?token=${token}` : 'https://ipinfo.io/json';
        const { data } = await axios.get(url, { timeout: 5000 });
        locationInfo = {
          ip: data.ip ?? '', city: data.city ?? '', region: data.region ?? '',
          country: data.country ?? '', loc: data.loc ?? '', org: data.org ?? '',
          postal: data.postal ?? '', timezone: data.timezone ?? '',
        };
      } catch { /* silently ignore */ }

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

  // ── Loading ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading form…</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-14">

        {/* ── Form Header ─────────────────────────────── */}
        <div className="text-center mb-8">
          {/* Brand mark */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200 mb-4">
            <span className="text-white font-black text-xl">E</span>
          </div>

          {form.unicode_text && (
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest rounded-full">
                {form.unicode_text}
              </span>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-500 text-sm mt-2.5 max-w-md mx-auto leading-relaxed">
              {form.description}
            </p>
          )}
        </div>

        {/* ── Progress (multi-page) ──────────────────── */}
        {totalPages > 1 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">
                Step {currentPage + 1} of {totalPages}
              </span>
              <span className="text-xs font-semibold text-blue-600">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Step bubbles */}
            <div className="flex justify-between mt-3">
              {pages.map((pg, i) => {
                const heading = pg.find((f) => f.field_type === 'section_heading');
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        i < currentPage
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                          : i === currentPage
                          ? 'bg-white text-blue-600 border-2 border-blue-600 shadow-sm'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {i < currentPage ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    {heading && (
                      <span className="text-[9px] text-gray-400 max-w-[60px] text-center leading-tight hidden sm:block truncate">
                        {heading.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Form Card ──────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100/80">
          {/* Top accent bar with gradient */}
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-3xl" />

          <form onSubmit={handleSubmit} noValidate>
            <div className="px-6 sm:px-10 py-8 space-y-6">
              {currentFields.map((field) => (
                <div
                  key={field.id}
                  id={`field-${field.id}`}
                  className={field.field_type === 'section_heading' ? '' : field.field_type === 'description_block' ? '' : ''}
                >
                  <DynamicField
                    field={field}
                    value={values[field.id] || ''}
                    error={errors[field.id]}
                    onChange={(val) => handleChange(field.id, val)}
                  />
                </div>
              ))}
            </div>

            {/* ── Navigation Buttons ───────────────────── */}
            <div className="px-6 sm:px-10 pb-8">
              <div className={`flex gap-3 ${currentPage > 0 ? 'justify-between' : 'justify-end'}`}>
                {currentPage > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                )}

                {!isLastPage ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-200 transition"
                  >
                    Continue
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting…
                      </>
                    ) : (
                      <>
                        Submit
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* ── Footer ─────────────────────────────────── */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by <span className="font-semibold text-gray-500">Enquire</span>
        </p>
      </div>
    </div>
  );
}
