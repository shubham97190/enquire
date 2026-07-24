# UI Branding & UX Improvements — Design

Date: 2026-07-25

## Overview

Four related improvements to the Enquire form-builder app:

1. Per-form logo + configurable footer copyright text
2. Login page rebrand with the AirPro logo
3. Submissions list & dashboard UX improvements (search, filter, bulk actions, mobile layout, polish)
4. Smoother redirect flow + responsive polish on the public dynamic form

All four ship together in one phase.

## 1. Per-form branding: logo + footer copyright

### Backend

`form_builder/models.py` — `EnquiryForm` gets two new fields:

- `logo = models.ImageField(upload_to='form_builder/logos/', blank=True, null=True)`
- `footer_text = models.CharField(max_length=255, blank=True, default='')`

A new migration is required. `footer_text` falls back to "Powered by Enquire" wherever it's blank.

### API

- `footer_text` is added to `EnquiryFormDetailSerializer`, `EnquiryFormCreateUpdateSerializer`, and `PublicFormSerializer` as a plain field — no special handling.
- Logo upload/removal is a dedicated multipart endpoint, kept separate from the existing JSON-based settings save:
  - `POST /admin/forms/:id/logo/` (multipart, field name `logo`) — sets/replaces the logo, returns the updated form detail (including logo URL).
  - `DELETE /admin/forms/:id/logo/` — clears the logo.
  - Same staff-ownership permission check as other admin form endpoints (`created_by == request.user` unless super admin).
- `logo` (URL) is included in `EnquiryFormDetailSerializer` and `PublicFormSerializer` as a read-only `ImageField`/URL.

### Admin UI (`FormBuilder.tsx`)

In the settings panel, alongside Title/Description/Redirect:

- Logo uploader: shows current logo thumbnail if set, a "click to upload" dropzone otherwise, and a "Remove" action. Uses the same file-read/preview pattern already used for image fields in `DynamicForm.tsx`'s `FileUpload` component. Upload/remove call the new endpoint immediately (not part of the batched settings save) so the preview updates right away.
- "Footer text" text input, placeholder text "Powered by Enquire", saved as part of the existing settings save.

### Public form (`DynamicForm.tsx`)

- Header brand mark: if `form.logo` is set, render it as an `<img>` in place of the generic gradient "E" tile; otherwise keep the current fallback unchanged.
- Footer: render `form.footer_text` if non-empty, else keep "Powered by Enquire".

## 2. Login page logo

Isolated change to `frontend/src/pages/admin/Login.tsx`:

- Replace the gradient "S" badge + "SurveyPanel" wordmark (current lines ~53-58) with:
  ```
  <img src="https://stage.airpronetworks.com/app/uploads/2026/07/logo-1.png" alt="AirPro" className="h-10 w-auto" />
  ```
- No other page copy changes — this is a badge swap only, not a full rebrand of the marketing panel on the right.

## 3. Submissions list & dashboard UX

### Backend (`form_builder/views.py`)

`AdminFormSubmissionsView` (currently a plain `ListAPIView` with no filtering):

- `search_fields = ['city', 'country', 'answers__answer_value']` — uses the already-configured `rest_framework.filters.SearchFilter` (no new dependency).
- A new `django_filters.FilterSet` (`django_filters` is already a configured default filter backend) providing:
  - `status` — exact match against `SubmissionStatus` choices.
  - `submitted_after` / `submitted_before` — date range on `submitted_at`.
- New `AdminFormSubmissionsBulkView`:
  - `POST /admin/forms/:id/submissions/bulk/`
  - Body: `{ "ids": ["<uuid>", ...], "action": "delete" | "set_status", "status"?: "reviewed" | "archived" | "submitted" }`
  - Same ownership check as the list/detail views (staff limited to forms they created).
  - Returns the count affected.

### Frontend — `FormSubmissions.tsx`

- Search input + status filter dropdown + date range picker above the table, wired into the existing paginated query params.
- Row selection: checkbox per row + "select all on this page" checkbox. When ≥1 row is selected, a floating action bar appears with "Delete selected" and "Mark as reviewed", both calling the new bulk endpoint (with a confirm modal for delete, reusing the existing `ConfirmModal` component).
- Responsive layout: below the `md` breakpoint, the table is replaced with a stacked card per submission — status badge, key answer preview, location/date, tap to expand into the existing detail modal — instead of the current horizontally-scrolling table.
- Loading skeleton rows while fetching (replacing the current blank-until-loaded state), and a distinct empty state for "no submissions ever" vs. "no results for these filters".

### Frontend — `Dashboard.tsx`

Visual-consistency pass, no new data/metrics:

- Align stat-card spacing/typography with the refreshed Submissions page.
- Loading skeletons for stat cards and charts instead of a blank flash.
- Consistent empty state when a form has zero submissions.

## 4. Redirect smoothing & dynamic form responsiveness

### Redirect flow

- New field on `EnquiryForm`: `redirect_delay_seconds = models.PositiveSmallIntegerField(default=5)`, added to the same serializers as `redirect_url`/`is_redirect`.
- Form Builder: shown only when "Enable redirect" is toggled on, as a number input next to the redirect URL field.
- `FormThankYou.tsx`:
  - Uses `redirect_delay_seconds` from the submit response instead of the hard-coded 5.
  - Replaces the plain countdown number with an animated progress indicator (CSS transition, no new library).
  - Because `redirect_url` is admin-supplied and typically off-site, a true SPA transition isn't possible for cross-origin targets — that final hop stays a full browser navigation. To smooth what's controllable: a brief fade-out transition on the thank-you card immediately precedes `window.location.href`. If the target happens to be same-origin, `navigate()` is used instead for an instant in-app transition.

### Dynamic form responsiveness (`DynamicForm.tsx`)

Multi-step paging (progress bar + step bubbles) already exists — this is a polish pass, not a new feature:

- Larger touch targets (~44px minimum) for step bubbles, Back/Continue/Submit buttons, rating stars, and the signature pad on small screens.
- Spacing/typography tightened for mobile widths, verified to scale cleanly up through desktop, consistent with the polish applied to the admin pages.

## Testing

- Backend: unit tests for the bulk submissions endpoint (delete, status change, permission checks for non-owning staff) and for search/filter query params on the submissions list.
- Backend: migration applies cleanly; new fields default sensibly for existing forms (no logo, empty footer_text, 5s redirect delay).
- Frontend: manual verification in-browser (desktop + mobile viewport) per `verification-before-completion` — logo upload/remove round-trip, footer text rendering, login logo, submissions search/filter/bulk actions and mobile card layout, dashboard skeletons, thank-you redirect timing/animation.
