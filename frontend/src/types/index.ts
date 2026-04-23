export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'SUPER_ADMIN' | 'STAFF';
  is_active: boolean;
  date_joined: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AdminUser;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface FormsDashboardData {
  total_forms: number;
  active_forms: number;
  inactive_forms: number;
  total_submissions: number;
  today_submissions: number;
  monthly_submissions: number;
  daily_trend: { date: string; count: number }[];
  monthly_trend: { month: string; count: number }[];
  top_forms: { form_id: string; form_title: string; submission_count: number }[];
  recent_forms: {
    id: string;
    title: string;
    slug: string;
    is_active: boolean;
    field_count: number;
    submission_count: number;
    created_at: string;
  }[];
  device_breakdown: { device_type: string; count: number }[];
}

// ──────────────────────────────────────────────
// Form Builder Types
// ──────────────────────────────────────────────

export const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
  { value: 'phone', label: 'Phone' },
  { value: 'password', label: 'Password' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'time', label: 'Time' },
  { value: 'select', label: 'Select Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'multi_checkbox', label: 'Multi Checkbox' },
  { value: 'file', label: 'File Upload' },
  { value: 'image', label: 'Image Upload' },
  { value: 'url', label: 'URL' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'section_heading', label: 'Section Heading' },
  { value: 'description_block', label: 'Description Block' },
  { value: 'rating', label: 'Rating' },
  { value: 'range_slider', label: 'Range Slider' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'signature', label: 'Signature' },
  { value: 'location', label: 'Location' },
] as const;

export interface FormBuilderField {
  id: string;
  label: string;
  slug: string;
  field_type: string;
  placeholder: string;
  help_text: string;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  default_value: string;
  options: { label: string; value: string }[];
  validation_rules: Record<string, unknown>;
  min_length: number | null;
  max_length: number | null;
  min_value: number | null;
  max_value: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface FormBuilderForm {
  id: string;
  title: string;
  slug: string;
  description: string;
  unicode_text: string;
  is_active: boolean;
  is_redirect: boolean;
  redirect_url: string;
  email_notifications: boolean;
  qr_code_url: string | null;
  fields: FormBuilderField[];
  submission_count: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface FormBuilderListItem {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  is_redirect: boolean;
  redirect_url: string;
  field_count: number;
  submission_count: number;
  created_at: string;
  updated_at: string;
}

export interface FormSubmissionListItem {
  id: string;
  submitted_at: string;
  ip_address: string | null;
  city: string;
  region: string;
  country: string;
  device_type: string;
  browser_name: string;
  os_name: string;
  is_mobile: boolean;
  status: string;
}

export interface FormSubmissionAnswer {
  id: string;
  question: string | null;
  question_label_snapshot: string;
  question_type_snapshot: string;
  answer_value: string;
  answer_json: unknown;
  created_at: string;
}

export interface FormSubmissionDetail {
  id: string;
  form: string;
  submitted_at: string;
  ip_address: string | null;
  city: string;
  region: string;
  country: string;
  loc: string;
  org: string;
  postal: string;
  timezone: string;
  device_type: string;
  device_brand: string;
  browser_name: string;
  os_name: string;
  is_mobile: boolean;
  is_tablet: boolean;
  is_desktop: boolean;
  is_android: boolean;
  is_ios: boolean;
  is_chrome: boolean;
  is_edge: boolean;
  user_agent: string;
  raw_device_info: Record<string, unknown>;
  raw_location_info: Record<string, unknown>;
  status: string;
  answers: FormSubmissionAnswer[];
}

export interface FormReportData {
  form_title: string;
  total_submissions: number;
  daily_trend: { date: string; count: number }[];
  device_breakdown: { device_type: string; count: number }[];
  browser_breakdown: { browser_name: string; count: number }[];
  os_breakdown: { os_name: string; count: number }[];
  location_breakdown: { city: string; country: string; count: number }[];
  field_analytics: {
    field_id: string;
    label: string;
    field_type: string;
    distribution: { answer_value: string; count: number }[];
  }[];
  field_completion: {
    field_id: string;
    label: string;
    is_required: boolean;
    answered: number;
    total: number;
    rate: number;
  }[];
}
