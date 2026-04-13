import api from './client';
import type {
  FormsDashboardData,
  LoginResponse,
  AdminUser,
  PaginatedResponse,
  FormBuilderForm,
  FormBuilderListItem,
  FormBuilderField,
  FormSubmissionListItem,
  FormSubmissionDetail,
  FormReportData,
} from '../types';

// ─── Admin Auth ────────────────────────────────────────

export const login = (username: string, password: string) =>
  api
    .post<LoginResponse>('/admin/auth/login/', { username, password })
    .then((r) => r.data);

export const logout = (refresh: string) =>
  api.post('/admin/auth/logout/', { refresh });

export const getMe = () =>
  api.get<AdminUser>('/admin/auth/me/').then((r) => r.data);

// ─── Admin Dashboard ──────────────────────────────────

export const getDashboard = () =>
  api.get<FormsDashboardData>('/admin/dashboard/').then((r) => r.data);

// ─── Admin Users ──────────────────────────────────────

export const getUsers = () =>
  api.get<AdminUser[]>('/admin/users/').then((r) => r.data);

export const createUser = (data: {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
}) => api.post<AdminUser>('/admin/users/', data).then((r) => r.data);

export const updateUser = (id: number, data: Partial<AdminUser & { password?: string }>) =>
  api.patch<AdminUser>(`/admin/users/${id}/`, data).then((r) => r.data);

export const deleteUser = (id: number) =>
  api.delete(`/admin/users/${id}/`);

// ─── Form Builder: Public ─────────────────────────────

export const getPublicForm = (slug: string) =>
  api.get<FormBuilderForm>(`/forms/${slug}/`).then((r) => r.data);

export const submitPublicForm = (slug: string, data: {
  answers: Record<string, string>;
  answers_json?: Record<string, unknown>;
  device_info?: Record<string, unknown>;
  location_info?: Record<string, unknown>;
}) =>
  api.post<{
    detail: string;
    submission_id: string;
    is_redirect: boolean;
    redirect_url: string;
  }>(`/forms/${slug}/submit/`, data).then((r) => r.data);

// ─── Form Builder: Admin CRUD ─────────────────────────

export const getAdminForms = () =>
  api.get<FormBuilderListItem[]>('/admin/forms/').then((r) => r.data);

export const getAdminFormDetail = (id: string) =>
  api.get<FormBuilderForm>(`/admin/forms/${id}/`).then((r) => r.data);

export const createAdminForm = (data: {
  title: string;
  description?: string;
  unicode_text?: string;
  is_active?: boolean;
  is_redirect?: boolean;
  redirect_url?: string;
}) =>
  api.post<FormBuilderForm>('/admin/forms/', data).then((r) => r.data);

export const updateAdminForm = (id: string, data: Partial<{
  title: string;
  description: string;
  unicode_text: string;
  is_active: boolean;
  is_redirect: boolean;
  redirect_url: string;
}>) =>
  api.patch<FormBuilderForm>(`/admin/forms/${id}/`, data).then((r) => r.data);

export const deleteAdminForm = (id: string) =>
  api.delete(`/admin/forms/${id}/`);

export const duplicateAdminForm = (id: string) =>
  api.post<FormBuilderForm>(`/admin/forms/${id}/duplicate/`).then((r) => r.data);

// ─── Form Builder: Admin Fields ───────────────────────

export const createFormField = (formId: string, data: Partial<FormBuilderField>) =>
  api.post<FormBuilderField>(`/admin/forms/${formId}/fields/create/`, data).then((r) => r.data);

export const updateFormField = (formId: string, fieldId: string, data: Partial<FormBuilderField>) =>
  api.patch<FormBuilderField>(`/admin/forms/${formId}/fields/${fieldId}/`, data).then((r) => r.data);

export const deleteFormField = (formId: string, fieldId: string) =>
  api.delete(`/admin/forms/${formId}/fields/${fieldId}/`);

export const bulkUpdateFormFields = (formId: string, fields: Partial<FormBuilderField>[]) =>
  api.put<FormBuilderField[]>(`/admin/forms/${formId}/fields/`, { fields }).then((r) => r.data);

// ─── Form Builder: Admin Submissions ──────────────────

export const getFormSubmissions = (formId: string, params?: Record<string, string>) =>
  api.get<PaginatedResponse<FormSubmissionListItem>>(`/admin/forms/${formId}/submissions/`, { params }).then((r) => r.data);

export const getFormSubmissionDetail = (formId: string, subId: string) =>
  api.get<FormSubmissionDetail>(`/admin/forms/${formId}/submissions/${subId}/`).then((r) => r.data);

export const exportFormSubmissions = (formId: string) =>
  api.get(`/admin/forms/${formId}/submissions/export/`, { responseType: 'blob' }).then((r) => r.data);

// ─── Form Builder: Admin Report ───────────────────────

export const getFormReport = (formId: string) =>
  api.get<FormReportData>(`/admin/forms/${formId}/report/`).then((r) => r.data);

