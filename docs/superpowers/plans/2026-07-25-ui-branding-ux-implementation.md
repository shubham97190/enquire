# UI Branding & UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-form logo/copyright branding, swap the login page logo, improve submissions/dashboard UX (search, filter, bulk actions, mobile layout), and smooth the redirect flow + mobile responsiveness of the public dynamic form.

**Architecture:** Backend additions are three small, independent extensions to the existing `form_builder` Django app (new model fields + migration, a dedicated multipart logo endpoint, and filter/bulk endpoints for submissions) — no new apps or major structural changes. Frontend work extends five existing pages (`FormBuilder`, `Login`, `DynamicForm`, `FormThankYou`, `FormSubmissions`, `Dashboard`) in place, following each file's existing patterns (Tailwind utility classes, local `useState`, the shared `api/endpoints.ts` client).

**Tech Stack:** Django 6 + Django REST Framework + `django-filter` (backend, already a dependency); React 18 + TypeScript + Tailwind CSS + axios (frontend, already in use). No new dependencies are introduced.

## Global Constraints

- Backend has no existing automated test suite; this plan introduces `backend/form_builder/tests.py` using Django's built-in test runner (`python manage.py test`), not pytest.
- Frontend has no test runner configured (`npm run dev|build|preview` only) — frontend verification is `tsc` type-checking (`npm run build`) plus manual in-browser checks, per the design spec's Testing section.
- All backend commands assume the `backend` virtualenv is active (see `README.md` → Manual Setup) and a reachable Postgres instance (`docker compose up db` or local Postgres) matching `backend/.env`.
- Staff/ownership permission model: `IsAdminUser` (any authenticated STAFF or SUPER_ADMIN) gates all `/admin/...` endpoints; individual views additionally check `obj.created_by == request.user` unless `request.user.is_super_admin` — every new admin endpoint in this plan must repeat that same check.
- No new UI component libraries — reuse existing patterns (`ConfirmModal`, Tailwind utility classes, `react-hot-toast`).

---

### Task 1: Backend — model fields for logo, footer text, redirect delay

**Files:**
- Modify: `backend/form_builder/models.py:34-76` (`EnquiryForm` class)
- Modify: `backend/form_builder/admin.py:14-19` (`EnquiryFormAdmin.readonly_fields`)
- Create: `backend/form_builder/migrations/00XX_enquiryform_logo_footer_redirect_delay.py` (via `makemigrations`, exact number auto-assigned)

**Interfaces:**
- Produces: `EnquiryForm.logo` (ImageField, blank/null), `EnquiryForm.footer_text` (CharField, blank, default `''`), `EnquiryForm.redirect_delay_seconds` (PositiveSmallIntegerField, default `5`) — consumed by Task 2 (serializers), Task 3 (logo endpoint), Task 4 (submit view).

- [ ] **Step 1: Add the three fields to `EnquiryForm`**

In `backend/form_builder/models.py`, in the `EnquiryForm` class, add these fields directly after `redirect_url` and before `email_notifications`:

```python
    redirect_delay_seconds = models.PositiveSmallIntegerField(default=5)
    logo = models.ImageField(upload_to='form_builder/logos/', blank=True, null=True)
    footer_text = models.CharField(max_length=255, blank=True, default='')
```

So the field block reads:

```python
    is_redirect = models.BooleanField(default=False)
    redirect_url = models.URLField(max_length=500, blank=True, default='')
    redirect_delay_seconds = models.PositiveSmallIntegerField(default=5)
    logo = models.ImageField(upload_to='form_builder/logos/', blank=True, null=True)
    footer_text = models.CharField(max_length=255, blank=True, default='')
    email_notifications = models.BooleanField(
        default=True,
        help_text='Send email notification to form owner on each new submission.',
    )
```

- [ ] **Step 2: Register `logo` as read-only in the Django admin (it's managed via the API, not the admin form)**

In `backend/form_builder/admin.py`, change:

```python
    readonly_fields = ['id', 'slug', 'qr_code', 'created_at', 'updated_at']
```

to:

```python
    readonly_fields = ['id', 'slug', 'qr_code', 'logo', 'created_at', 'updated_at']
```

- [ ] **Step 3: Generate the migration**

Run: `cd backend && python manage.py makemigrations form_builder`
Expected output: a new file reported under `form_builder/migrations/`, e.g. `Migrations for 'form_builder': ... - Add field logo to enquiryform ... - Add field footer_text to enquiryform ... - Add field redirect_delay_seconds to enquiryform`

- [ ] **Step 4: Apply the migration**

Run: `cd backend && python manage.py migrate form_builder`
Expected output: `Applying form_builder.00XX_...... OK`

- [ ] **Step 5: Verify existing forms default sensibly**

Run: `cd backend && python manage.py shell -c "from form_builder.models import EnquiryForm; f = EnquiryForm.objects.first(); print(f.logo, repr(f.footer_text), f.redirect_delay_seconds) if f else print('no forms yet — OK')"`
Expected output: `None '' 5` (or `no forms yet — OK` on an empty dev DB) — confirms no migration data-loss and correct defaults for pre-existing rows.

- [ ] **Step 6: Commit**

```bash
git add backend/form_builder/models.py backend/form_builder/admin.py backend/form_builder/migrations/
git commit -m "feat: add logo, footer_text, redirect_delay_seconds fields to EnquiryForm"
```

---

### Task 2: Backend — expose new fields through serializers

**Files:**
- Modify: `backend/form_builder/serializers.py:69-109` (`EnquiryFormDetailSerializer`, `EnquiryFormCreateUpdateSerializer`)
- Modify: `backend/form_builder/serializers.py:127-141` (`PublicFormSerializer`)
- Modify: `backend/form_builder/views.py:172-185` (`PublicFormView.get`) — pass request context so `logo_url` can build an absolute URI

**Interfaces:**
- Consumes: `EnquiryForm.logo`, `.footer_text`, `.redirect_delay_seconds` (Task 1).
- Produces: `EnquiryFormDetailSerializer` output gains `logo_url` (string | null), `footer_text` (string), `redirect_delay_seconds` (int). `PublicFormSerializer` output gains the same three keys. `EnquiryFormCreateUpdateSerializer` accepts `footer_text` and `redirect_delay_seconds` as writable input (not `logo` — that's Task 3's dedicated endpoint). Consumed by Task 3 (returns `EnquiryFormDetailSerializer` data), Task 4 (submit response), and all frontend tasks (8-13).

- [ ] **Step 1: Add `logo_url` to `EnquiryFormDetailSerializer` and include the three new fields**

In `backend/form_builder/serializers.py`, replace the `EnquiryFormDetailSerializer` class:

```python
class EnquiryFormDetailSerializer(serializers.ModelSerializer):
    fields = EnquiryFormFieldSerializer(many=True, read_only=True)
    submission_count = serializers.SerializerMethodField()
    qr_code_url = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = EnquiryForm
        fields = [
            'id', 'title', 'slug', 'description', 'unicode_text',
            'is_active', 'is_redirect', 'redirect_url', 'redirect_delay_seconds',
            'email_notifications', 'logo_url', 'footer_text',
            'qr_code_url', 'fields', 'submission_count',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_by', 'created_at', 'updated_at']

    def get_submission_count(self, obj):
        return obj.submissions.count()

    def get_qr_code_url(self, obj):
        if obj.qr_code:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_code.url)
            return obj.qr_code.url
        return None

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
```

- [ ] **Step 2: Make `footer_text` and `redirect_delay_seconds` writable via the settings-save endpoint**

Replace the `EnquiryFormCreateUpdateSerializer` class:

```python
class EnquiryFormCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnquiryForm
        fields = [
            'id', 'title', 'description', 'unicode_text',
            'is_active', 'is_redirect', 'redirect_url', 'redirect_delay_seconds',
            'email_notifications', 'footer_text',
        ]
        read_only_fields = ['id']

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Title must be at least 2 characters.')
        return value

    def validate_redirect_delay_seconds(self, value):
        if value < 0 or value > 60:
            raise serializers.ValidationError('Must be between 0 and 60 seconds.')
        return value
```

- [ ] **Step 3: Expose the same fields on the public form serializer**

Replace the `PublicFormSerializer` class:

```python
class PublicFormSerializer(serializers.ModelSerializer):
    """Read-only form for public rendering."""
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = EnquiryForm
        fields = [
            'id', 'title', 'slug', 'description', 'unicode_text',
            'is_redirect', 'redirect_url', 'logo_url', 'footer_text',
        ]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        active_fields = instance.fields.filter(is_active=True).order_by('sort_order', 'created_at')
        rep['fields'] = PublicFormFieldSerializer(active_fields, many=True).data
        return rep
```

- [ ] **Step 4: Pass request context in `PublicFormView` so `logo_url` resolves to an absolute URL**

In `backend/form_builder/views.py`, in `PublicFormView.get`, change:

```python
        serializer = PublicFormSerializer(form)
```

to:

```python
        serializer = PublicFormSerializer(form, context={'request': request})
```

- [ ] **Step 5: Manually verify via Django shell**

Run: `cd backend && python manage.py shell -c "
from form_builder.serializers import EnquiryFormCreateUpdateSerializer
from form_builder.models import EnquiryForm
f = EnquiryForm.objects.first()
s = EnquiryFormCreateUpdateSerializer(f, data={'footer_text': 'Test Co © 2026', 'redirect_delay_seconds': 10}, partial=True)
print(s.is_valid(), s.errors)
"`
Expected output: `True {}` (on a dev DB with at least one form; if none exist, create one first via the admin API or Django admin).

- [ ] **Step 6: Commit**

```bash
git add backend/form_builder/serializers.py backend/form_builder/views.py
git commit -m "feat: expose logo_url, footer_text, redirect_delay_seconds via form serializers"
```

---

### Task 3: Backend — dedicated logo upload/remove endpoint

**Files:**
- Modify: `backend/form_builder/views.py:1-36` (imports), and add new view near `AdminFormDetailView` (~line 382)
- Modify: `backend/form_builder/urls.py`
- Create: `backend/form_builder/tests.py` (new file — first tests in this app)

**Interfaces:**
- Consumes: `EnquiryFormDetailSerializer` (Task 2), `IsAdminUser` (existing, from `accounts.views`).
- Produces: `POST /api/admin/forms/<uuid:pk>/logo/` (multipart, field `logo`) and `DELETE /api/admin/forms/<uuid:pk>/logo/`, both returning `EnquiryFormDetailSerializer` data. Consumed by Task 9 (`uploadFormLogo`/`deleteFormLogo` in `api/endpoints.ts`).

- [ ] **Step 1: Write the failing tests**

Create `backend/form_builder/tests.py`:

```python
import io

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from .models import EnquiryForm

User = get_user_model()


def make_image_file(name='logo.png'):
    buf = io.BytesIO()
    Image.new('RGB', (10, 10), color='red').save(buf, format='PNG')
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type='image/png')


class FormLogoUploadTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', password='pass12345', role=User.Role.STAFF,
        )
        self.other_staff = User.objects.create_user(
            username='other', password='pass12345', role=User.Role.STAFF,
        )
        self.form = EnquiryForm.objects.create(title='Test Form', created_by=self.owner)
        self.url = f'/api/admin/forms/{self.form.id}/logo/'

    def test_owner_can_upload_logo(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {'logo': make_image_file()}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['logo_url'])
        self.form.refresh_from_db()
        self.assertTrue(bool(self.form.logo))

    def test_non_owner_staff_cannot_upload_logo(self):
        self.client.force_authenticate(self.other_staff)
        response = self.client.post(self.url, {'logo': make_image_file()}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_upload_without_file_returns_400(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_owner_can_remove_logo(self):
        self.client.force_authenticate(self.owner)
        self.client.post(self.url, {'logo': make_image_file()}, format='multipart')
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['logo_url'])
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python manage.py test form_builder.tests.FormLogoUploadTests -v 2`
Expected: `ModuleNotFoundError` or 404s — `AdminFormLogoView` / URL don't exist yet.

- [ ] **Step 3: Add the view**

In `backend/form_builder/views.py`, add `MultiPartParser`, `FormParser` to the DRF imports at the top:

```python
from rest_framework import generics, status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
```

Then add this class directly after `AdminFormDetailView` (after its closing `update` method, before `class AdminFormDuplicateView`):

```python
class AdminFormLogoView(APIView):
    """Admin: Upload or remove a form's logo image."""
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def _get_form_or_error(self, request, pk):
        try:
            form = EnquiryForm.objects.get(pk=pk)
        except EnquiryForm.DoesNotExist:
            return None, Response({'detail': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not request.user.is_super_admin and form.created_by != request.user:
            return None, Response(
                {'detail': 'You do not have permission to modify this form.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return form, None

    def post(self, request, pk):
        form, error = self._get_form_or_error(request, pk)
        if error:
            return error
        logo = request.FILES.get('logo')
        if not logo:
            return Response({'logo': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)
        form.logo = logo
        form.save(update_fields=['logo', 'updated_at'])
        detail = EnquiryFormDetailSerializer(form, context={'request': request})
        return Response(detail.data)

    def delete(self, request, pk):
        form, error = self._get_form_or_error(request, pk)
        if error:
            return error
        form.logo.delete(save=False)
        form.logo = None
        form.save(update_fields=['logo', 'updated_at'])
        detail = EnquiryFormDetailSerializer(form, context={'request': request})
        return Response(detail.data)
```

- [ ] **Step 4: Wire the URL**

In `backend/form_builder/urls.py`, add directly after the `admin-form-duplicate` line:

```python
    path('admin/forms/<uuid:pk>/logo/', views.AdminFormLogoView.as_view(), name='admin-form-logo'),
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && python manage.py test form_builder.tests.FormLogoUploadTests -v 2`
Expected: `Ran 4 tests ... OK`

- [ ] **Step 6: Commit**

```bash
git add backend/form_builder/views.py backend/form_builder/urls.py backend/form_builder/tests.py
git commit -m "feat: add admin logo upload/remove endpoint for forms"
```

---

### Task 4: Backend — return redirect delay from submit endpoint

**Files:**
- Modify: `backend/form_builder/views.py:271-276` (`PublicFormSubmitView.post`, response dict)
- Modify: `backend/form_builder/tests.py` (append)

**Interfaces:**
- Consumes: `EnquiryForm.redirect_delay_seconds` (Task 1).
- Produces: submit response gains `redirect_delay_seconds` (int, `0` when `is_redirect` is false). Consumed by Task 9 (`submitPublicForm` return type) and Task 13 (`FormThankYou.tsx`).

- [ ] **Step 1: Write the failing test**

Append to `backend/form_builder/tests.py`:

```python
class PublicFormSubmitRedirectDelayTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner2', password='pass12345', role=User.Role.STAFF,
        )

    def test_submit_response_includes_redirect_delay_when_redirecting(self):
        form = EnquiryForm.objects.create(
            title='Redirect Form',
            created_by=self.owner,
            is_redirect=True,
            redirect_url='https://example.com/thanks',
            redirect_delay_seconds=8,
            email_notifications=False,
        )
        response = self.client.post(
            f'/api/forms/{form.slug}/submit/',
            {'answers': {'dummy': 'x'}},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['redirect_delay_seconds'], 8)

    def test_submit_response_delay_is_zero_when_not_redirecting(self):
        form = EnquiryForm.objects.create(
            title='No Redirect Form',
            created_by=self.owner,
            is_redirect=False,
            redirect_delay_seconds=8,
            email_notifications=False,
        )
        response = self.client.post(
            f'/api/forms/{form.slug}/submit/',
            {'answers': {'dummy': 'x'}},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['redirect_delay_seconds'], 0)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python manage.py test form_builder.tests.PublicFormSubmitRedirectDelayTests -v 2`
Expected: `KeyError: 'redirect_delay_seconds'`

- [ ] **Step 3: Add the field to the response**

In `backend/form_builder/views.py`, in `PublicFormSubmitView.post`, change:

```python
        resp = {
            'detail': 'Form submitted successfully.',
            'submission_id': str(submission.id),
            'is_redirect': form.is_redirect,
            'redirect_url': form.redirect_url if form.is_redirect else '',
        }
```

to:

```python
        resp = {
            'detail': 'Form submitted successfully.',
            'submission_id': str(submission.id),
            'is_redirect': form.is_redirect,
            'redirect_url': form.redirect_url if form.is_redirect else '',
            'redirect_delay_seconds': form.redirect_delay_seconds if form.is_redirect else 0,
        }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && python manage.py test form_builder.tests.PublicFormSubmitRedirectDelayTests -v 2`
Expected: `Ran 2 tests ... OK`

- [ ] **Step 5: Commit**

```bash
git add backend/form_builder/views.py backend/form_builder/tests.py
git commit -m "feat: return per-form redirect_delay_seconds from submit endpoint"
```

---

### Task 5: Backend — search & filter for admin submissions list

**Files:**
- Create: `backend/form_builder/filters.py`
- Modify: `backend/form_builder/views.py:534-546` (`AdminFormSubmissionsView`)
- Modify: `backend/form_builder/tests.py` (append)

**Interfaces:**
- Consumes: `EnquirySubmission`, `SubmissionStatus` (existing model).
- Produces: `GET /api/admin/forms/<uuid:pk>/submissions/?search=...&status=...&submitted_after=YYYY-MM-DD&submitted_before=YYYY-MM-DD`. Consumed by Task 14 (`FormSubmissions.tsx` search/filter bar).

- [ ] **Step 1: Write the failing tests**

Append to `backend/form_builder/tests.py`:

```python
from .models import EnquirySubmission, SubmissionStatus


class AdminSubmissionsFilterTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner3', password='pass12345', role=User.Role.STAFF,
        )
        self.form = EnquiryForm.objects.create(title='Filter Form', created_by=self.owner)
        self.sub_reviewed = EnquirySubmission.objects.create(
            form=self.form, city='Mumbai', status=SubmissionStatus.REVIEWED,
        )
        self.sub_submitted = EnquirySubmission.objects.create(
            form=self.form, city='Delhi', status=SubmissionStatus.SUBMITTED,
        )
        self.url = f'/api/admin/forms/{self.form.id}/submissions/'
        self.client.force_authenticate(self.owner)

    def test_filter_by_status(self):
        response = self.client.get(self.url, {'status': 'reviewed'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in response.data['results']]
        self.assertEqual(ids, [str(self.sub_reviewed.id)])

    def test_search_by_city(self):
        response = self.client.get(self.url, {'search': 'Delhi'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in response.data['results']]
        self.assertEqual(ids, [str(self.sub_submitted.id)])
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python manage.py test form_builder.tests.AdminSubmissionsFilterTests -v 2`
Expected: both tests fail — `status`/`search` query params currently have no effect, so both submissions are returned instead of one.

- [ ] **Step 3: Create the FilterSet**

Create `backend/form_builder/filters.py`:

```python
import django_filters

from .models import EnquirySubmission, SubmissionStatus


class SubmissionFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=SubmissionStatus.choices)
    submitted_after = django_filters.DateFilter(field_name='submitted_at', lookup_expr='date__gte')
    submitted_before = django_filters.DateFilter(field_name='submitted_at', lookup_expr='date__lte')

    class Meta:
        model = EnquirySubmission
        fields = ['status', 'submitted_after', 'submitted_before']
```

- [ ] **Step 4: Wire it into the view**

In `backend/form_builder/views.py`, add the import near the top (with the other local imports):

```python
from .filters import SubmissionFilter
```

Then replace `AdminFormSubmissionsView`:

```python
class AdminFormSubmissionsView(generics.ListAPIView):
    """Admin: List submissions for a specific form.
    STAFF can only view submissions for forms they created.
    Supports ?search=, ?status=, ?submitted_after=, ?submitted_before=
    (search/filter backends configured project-wide in settings.REST_FRAMEWORK).
    """
    permission_classes = [IsAdminUser]
    serializer_class = SubmissionListSerializer
    filterset_class = SubmissionFilter
    search_fields = ['city', 'country', 'answers__answer_value']

    def get_queryset(self):
        user = self.request.user
        base = EnquirySubmission.objects.filter(form_id=self.kwargs['pk']).distinct()
        if not user.is_super_admin:
            base = base.filter(form__created_by=user)
        return base.order_by('-submitted_at')
```

(`.distinct()` is required because the `answers__answer_value` search field joins across a related table, which can otherwise duplicate rows when a submission has multiple matching answers.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && python manage.py test form_builder.tests.AdminSubmissionsFilterTests -v 2`
Expected: `Ran 2 tests ... OK`

- [ ] **Step 6: Commit**

```bash
git add backend/form_builder/filters.py backend/form_builder/views.py backend/form_builder/tests.py
git commit -m "feat: add search and status/date filtering to admin submissions list"
```

---

### Task 6: Backend — bulk delete / bulk status-change for submissions

**Files:**
- Modify: `backend/form_builder/views.py` (add new view near `AdminFormSubmissionDetailView`, ~line 549)
- Modify: `backend/form_builder/urls.py`
- Modify: `backend/form_builder/tests.py` (append)

**Interfaces:**
- Consumes: `EnquirySubmission`, `SubmissionStatus` (existing).
- Produces: `POST /api/admin/forms/<uuid:pk>/submissions/bulk/` with body `{"ids": [...], "action": "delete" | "set_status", "status"?: "submitted"|"reviewed"|"archived"}`, returns `{"affected": <int>}`. Consumed by Task 15 (`FormSubmissions.tsx` bulk action bar).

- [ ] **Step 1: Write the failing tests**

Append to `backend/form_builder/tests.py`:

```python
class AdminSubmissionsBulkActionTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner4', password='pass12345', role=User.Role.STAFF,
        )
        self.other_staff = User.objects.create_user(
            username='other4', password='pass12345', role=User.Role.STAFF,
        )
        self.form = EnquiryForm.objects.create(title='Bulk Form', created_by=self.owner)
        self.sub1 = EnquirySubmission.objects.create(form=self.form, status=SubmissionStatus.SUBMITTED)
        self.sub2 = EnquirySubmission.objects.create(form=self.form, status=SubmissionStatus.SUBMITTED)
        self.url = f'/api/admin/forms/{self.form.id}/submissions/bulk/'

    def test_owner_can_bulk_set_status(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {
            'ids': [str(self.sub1.id), str(self.sub2.id)],
            'action': 'set_status',
            'status': 'reviewed',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['affected'], 2)
        self.sub1.refresh_from_db()
        self.assertEqual(self.sub1.status, SubmissionStatus.REVIEWED)

    def test_owner_can_bulk_delete(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {
            'ids': [str(self.sub1.id)],
            'action': 'delete',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['affected'], 1)
        self.assertFalse(EnquirySubmission.objects.filter(id=self.sub1.id).exists())

    def test_non_owner_staff_cannot_bulk_act(self):
        self.client.force_authenticate(self.other_staff)
        response = self.client.post(self.url, {
            'ids': [str(self.sub1.id)],
            'action': 'delete',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_action_returns_400(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {
            'ids': [str(self.sub1.id)],
            'action': 'nonsense',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && python manage.py test form_builder.tests.AdminSubmissionsBulkActionTests -v 2`
Expected: 404s — the endpoint doesn't exist yet.

- [ ] **Step 3: Add `SubmissionStatus` to the views.py imports**

In `backend/form_builder/views.py`, update the models import block:

```python
from .models import (
    EnquiryForm,
    EnquiryFormField,
    EnquirySubmission,
    EnquirySubmissionAnswer,
    FieldType,
    SubmissionStatus,
)
```

- [ ] **Step 4: Add the bulk view**

Add this class directly after `AdminFormSubmissionDetailView`:

```python
class AdminFormSubmissionsBulkView(APIView):
    """Admin: Bulk delete or bulk status-change submissions for a form."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            form = EnquiryForm.objects.get(pk=pk)
        except EnquiryForm.DoesNotExist:
            return Response({'detail': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not request.user.is_super_admin and form.created_by != request.user:
            return Response(
                {'detail': 'You do not have permission to modify this form.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        ids = request.data.get('ids')
        action = request.data.get('action')
        if not isinstance(ids, list) or not ids:
            return Response({'ids': ['This field must be a non-empty list.']}, status=status.HTTP_400_BAD_REQUEST)
        if action not in ('delete', 'set_status'):
            return Response({'action': ['Must be "delete" or "set_status".']}, status=status.HTTP_400_BAD_REQUEST)

        queryset = EnquirySubmission.objects.filter(form=form, id__in=ids)

        if action == 'delete':
            count = queryset.count()
            queryset.delete()
            return Response({'affected': count})

        new_status = request.data.get('status')
        valid_statuses = [c[0] for c in SubmissionStatus.choices]
        if new_status not in valid_statuses:
            return Response(
                {'status': [f'Must be one of: {", ".join(valid_statuses)}']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        count = queryset.update(status=new_status)
        return Response({'affected': count})
```

- [ ] **Step 5: Wire the URL**

In `backend/form_builder/urls.py`, add directly after the `admin-form-submissions-export` line:

```python
    path('admin/forms/<uuid:pk>/submissions/bulk/', views.AdminFormSubmissionsBulkView.as_view(), name='admin-form-submissions-bulk'),
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && python manage.py test form_builder.tests.AdminSubmissionsBulkActionTests -v 2`
Expected: `Ran 4 tests ... OK`

- [ ] **Step 7: Run the full backend test suite to confirm no regressions**

Run: `cd backend && python manage.py test form_builder -v 2`
Expected: all tests from Tasks 3-6 pass, `OK` overall.

- [ ] **Step 8: Commit**

```bash
git add backend/form_builder/views.py backend/form_builder/urls.py backend/form_builder/tests.py
git commit -m "feat: add bulk delete / bulk status-change endpoint for submissions"
```

---

### Task 7: Frontend — types for new fields

**Files:**
- Modify: `frontend/src/types/index.ts:99-115` (`FormBuilderForm`)
- Modify: `frontend/src/types/index.ts:130-142` (`FormSubmissionListItem` — no field changes, but add a shared status union type)

**Interfaces:**
- Produces: `FormBuilderForm.logo_url: string | null`, `.footer_text: string`, `.redirect_delay_seconds: number`. `SubmissionStatusValue` type (`'submitted' | 'reviewed' | 'archived'`). Consumed by Tasks 8, 10-13.

- [ ] **Step 1: Extend `FormBuilderForm`**

In `frontend/src/types/index.ts`, replace:

```typescript
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
```

with:

```typescript
export interface FormBuilderForm {
  id: string;
  title: string;
  slug: string;
  description: string;
  unicode_text: string;
  is_active: boolean;
  is_redirect: boolean;
  redirect_url: string;
  redirect_delay_seconds: number;
  email_notifications: boolean;
  qr_code_url: string | null;
  logo_url: string | null;
  footer_text: string;
  fields: FormBuilderField[];
  submission_count: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Add a shared submission-status type**

Directly above `export interface FormSubmissionListItem {`, add:

```typescript
export type SubmissionStatusValue = 'submitted' | 'reviewed' | 'archived';
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npm run build`
Expected: fails with errors in `FormBuilder.tsx`/`DynamicForm.tsx`/etc. about missing properties when constructing/reading `FormBuilderForm` — this is expected until Tasks 9-13 catch up. Confirm the *only* errors are about the fields just added (not unrelated syntax errors), then proceed — this file's own change is syntactically valid TypeScript.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add logo_url, footer_text, redirect_delay_seconds to FormBuilderForm type"
```

---

### Task 8: Frontend — API client functions for logo upload, bulk actions, extended settings save

**Files:**
- Modify: `frontend/src/api/endpoints.ts:79-105` (`createAdminForm`, `updateAdminForm`)
- Modify: `frontend/src/api/endpoints.ts:58-69` (`submitPublicForm` return type)
- Modify: `frontend/src/api/endpoints.ts:121-135` (Form Builder: Admin Submissions section — add bulk action + import `SubmissionStatusValue`)

**Interfaces:**
- Consumes: `FormBuilderForm`, `SubmissionStatusValue` (Task 7).
- Produces: `uploadFormLogo(id, file): Promise<FormBuilderForm>`, `deleteFormLogo(id): Promise<FormBuilderForm>`, `bulkUpdateSubmissions(formId, ids, action, status?): Promise<{affected: number}>`. Consumed by Tasks 10 (logo UI), 15 (bulk action bar).

- [ ] **Step 1: Extend `submitPublicForm`'s return type with `redirect_delay_seconds`**

In `frontend/src/api/endpoints.ts`, change:

```typescript
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
```

to:

```typescript
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
    redirect_delay_seconds: number;
  }>(`/forms/${slug}/submit/`, data).then((r) => r.data);
```

- [ ] **Step 2: Add `footer_text` and `redirect_delay_seconds` to the create/update payload types**

Change:

```typescript
export const createAdminForm = (data: {
  title: string;
  description?: string;
  unicode_text?: string;
  is_active?: boolean;
  is_redirect?: boolean;
  redirect_url?: string;
  email_notifications?: boolean;
}) =>
  api.post<FormBuilderForm>('/admin/forms/', data).then((r) => r.data);

export const updateAdminForm = (id: string, data: Partial<{
  title: string;
  description: string;
  unicode_text: string;
  is_active: boolean;
  is_redirect: boolean;
  redirect_url: string;
  email_notifications: boolean;
}>) =>
  api.patch<FormBuilderForm>(`/admin/forms/${id}/`, data).then((r) => r.data);
```

to:

```typescript
export const createAdminForm = (data: {
  title: string;
  description?: string;
  unicode_text?: string;
  is_active?: boolean;
  is_redirect?: boolean;
  redirect_url?: string;
  redirect_delay_seconds?: number;
  email_notifications?: boolean;
  footer_text?: string;
}) =>
  api.post<FormBuilderForm>('/admin/forms/', data).then((r) => r.data);

export const updateAdminForm = (id: string, data: Partial<{
  title: string;
  description: string;
  unicode_text: string;
  is_active: boolean;
  is_redirect: boolean;
  redirect_url: string;
  redirect_delay_seconds: number;
  email_notifications: boolean;
  footer_text: string;
}>) =>
  api.patch<FormBuilderForm>(`/admin/forms/${id}/`, data).then((r) => r.data);

// ─── Form Builder: Admin Logo ──────────────────────────

export const uploadFormLogo = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('logo', file);
  return api.post<FormBuilderForm>(`/admin/forms/${id}/logo/`, formData).then((r) => r.data);
};

export const deleteFormLogo = (id: string) =>
  api.delete<FormBuilderForm>(`/admin/forms/${id}/logo/`).then((r) => r.data);
```

- [ ] **Step 3: Add the bulk submissions action function**

Add `SubmissionStatusValue` to the type import at the top of the file:

```typescript
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
  SubmissionStatusValue,
} from '../types';
```

Then, directly after `exportFormSubmissions`, add:

```typescript
export const bulkUpdateSubmissions = (
  formId: string,
  ids: string[],
  action: 'delete' | 'set_status',
  status?: SubmissionStatusValue,
) =>
  api
    .post<{ affected: number }>(`/admin/forms/${formId}/submissions/bulk/`, { ids, action, status })
    .then((r) => r.data);
```

- [ ] **Step 4: Verify the logo upload sends correct multipart headers**

Run: `cd frontend && npm run dev`, log in to the admin panel, open any form's builder page, and (once Task 10 wires up the UI) upload a small PNG. Before Task 10 exists, this can instead be checked directly from the browser console on any admin page while authenticated:

```javascript
const fd = new FormData();
fd.append('logo', new File(['x'], 'test.png', { type: 'image/png' }));
fetch('/api/admin/forms/<a-real-form-uuid>/logo/', {
  method: 'POST',
  headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
  body: fd,
}).then((r) => r.json()).then(console.log);
```

Expected: response JSON includes a non-null `logo_url`. If instead the backend returns a 400 about missing boundary/invalid multipart body, axios's automatic `FormData` content-type handling didn't kick in for `uploadFormLogo` in Step 2 — fix it by passing an explicit `transformRequest` override:

```typescript
export const uploadFormLogo = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('logo', file);
  return api
    .post<FormBuilderForm>(`/admin/forms/${id}/logo/`, formData, {
      transformRequest: (data, headers) => {
        delete headers['Content-Type'];
        return data;
      },
    })
    .then((r) => r.data);
};
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/endpoints.ts
git commit -m "feat: add logo upload/delete and bulk submissions API client functions"
```

---

### Task 9: Frontend — Form Builder settings: logo upload, footer text, redirect delay

**Files:**
- Modify: `frontend/src/pages/admin/FormBuilder.tsx:280-364` (state + `fetchForm` + dirty-check + `handleSaveSettings`)
- Modify: `frontend/src/pages/admin/FormBuilder.tsx:592-698` (Settings Card JSX)

**Interfaces:**
- Consumes: `uploadFormLogo`, `deleteFormLogo`, `updateAdminForm` (Task 8), `FormBuilderForm` (Task 7).
- Produces: none consumed elsewhere — this is the admin-facing settings UI.

- [ ] **Step 1: Add state and load the new fields**

In `frontend/src/pages/admin/FormBuilder.tsx`, change:

```typescript
  const [unicodeText, setUnicodeText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isRedirect, setIsRedirect] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [settingsDirty, setSettingsDirty] = useState(false);
```

to:

```typescript
  const [unicodeText, setUnicodeText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isRedirect, setIsRedirect] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [redirectDelaySeconds, setRedirectDelaySeconds] = useState(5);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [footerText, setFooterText] = useState('');
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
```

Change `fetchForm` from:

```typescript
      setIsRedirect(data.is_redirect);
      setRedirectUrl(data.redirect_url);
      setEmailNotifications(data.email_notifications ?? true);
      setSettingsDirty(false);
```

to:

```typescript
      setIsRedirect(data.is_redirect);
      setRedirectUrl(data.redirect_url);
      setRedirectDelaySeconds(data.redirect_delay_seconds ?? 5);
      setEmailNotifications(data.email_notifications ?? true);
      setFooterText(data.footer_text ?? '');
      setSettingsDirty(false);
```

Change the dirty-check effect from:

```typescript
    const changed =
      title !== form.title ||
      description !== form.description ||
      unicodeText !== form.unicode_text ||
      isActive !== form.is_active ||
      isRedirect !== form.is_redirect ||
      redirectUrl !== form.redirect_url ||
      emailNotifications !== (form.email_notifications ?? true);
    setSettingsDirty(changed);
  }, [title, description, unicodeText, isActive, isRedirect, redirectUrl, form]);
```

to:

```typescript
    const changed =
      title !== form.title ||
      description !== form.description ||
      unicodeText !== form.unicode_text ||
      isActive !== form.is_active ||
      isRedirect !== form.is_redirect ||
      redirectUrl !== form.redirect_url ||
      redirectDelaySeconds !== (form.redirect_delay_seconds ?? 5) ||
      emailNotifications !== (form.email_notifications ?? true) ||
      footerText !== (form.footer_text ?? '');
    setSettingsDirty(changed);
  }, [title, description, unicodeText, isActive, isRedirect, redirectUrl, redirectDelaySeconds, emailNotifications, footerText, form]);
```

Change `handleSaveSettings`'s payload from:

```typescript
      const updated = await api.updateAdminForm(id, {
        title,
        description,
        unicode_text: unicodeText,
        is_active: isActive,
        is_redirect: isRedirect,
        redirect_url: redirectUrl,
        email_notifications: emailNotifications,
      });
```

to:

```typescript
      const updated = await api.updateAdminForm(id, {
        title,
        description,
        unicode_text: unicodeText,
        is_active: isActive,
        is_redirect: isRedirect,
        redirect_url: redirectUrl,
        redirect_delay_seconds: redirectDelaySeconds,
        email_notifications: emailNotifications,
        footer_text: footerText,
      });
```

- [ ] **Step 2: Add the logo upload/remove handlers**

Directly after `handleSaveSettings`, add:

```typescript
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setLogoUploading(true);
    try {
      const updated = await api.uploadFormLogo(id, file);
      setForm(updated);
      toast.success('Logo updated');
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleLogoRemove = async () => {
    if (!id) return;
    setLogoUploading(true);
    try {
      const updated = await api.deleteFormLogo(id);
      setForm(updated);
      toast.success('Logo removed');
    } catch {
      toast.error('Failed to remove logo');
    } finally {
      setLogoUploading(false);
    }
  };
```

- [ ] **Step 3: Add the Logo, Footer Text, and Redirect Delay UI to the Settings Card**

In the Settings Card JSX, directly after the "Badge / Emoji" field block (the `<div>` ending right before `<div className="flex items-center gap-4 pt-1">`), add:

```tsx
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Logo</label>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                {form?.logo_url ? (
                  <div className="flex items-center gap-3">
                    <img src={form.logo_url} alt="Form logo" className="h-12 w-12 object-contain rounded-lg border border-gray-200 bg-white" />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleLogoRemove}
                        disabled={logoUploading}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="w-full border-2 border-dashed border-gray-200 rounded-lg px-3 py-4 text-center text-xs text-gray-500 hover:border-blue-400 hover:bg-blue-50/30 transition disabled:opacity-50"
                  >
                    {logoUploading ? 'Uploading…' : 'Click to upload a logo'}
                  </button>
                )}
              </div>
```

Directly after the existing "Redirect URL" conditional block (right after its closing `</div>` and the `{isRedirect && ( ... )}` block closes, but still inside `{isRedirect && ( <div> ... )}`), extend the same conditional block to add the delay input. Change:

```tsx
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
```

to:

```tsx
              {isRedirect && (
                <div className="space-y-3">
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
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Redirect Delay (seconds)</label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={redirectDelaySeconds}
                      onChange={(e) => setRedirectDelaySeconds(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
```

Directly after that block (still before the "Save Changes" button), add the footer text field:

```tsx
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Footer Text</label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Powered by Enquire"
                />
              </div>
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 5: Manually verify in the browser**

Run: `cd frontend && npm run dev`, then:
1. Log in, open any form's Builder page.
2. Upload a logo — confirm it appears immediately with Replace/Remove options, no page reload needed.
3. Enable Redirect, set a delay, set footer text, click Save Changes — confirm the button reads "Saved ✓" and reloading the page keeps all three values.
4. Click Remove on the logo — confirm it reverts to the upload prompt.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/FormBuilder.tsx
git commit -m "feat: add logo upload, footer text, and redirect delay to Form Builder settings"
```

---

### Task 10: Frontend — login page logo swap

**Files:**
- Modify: `frontend/src/pages/admin/Login.tsx:52-58`

**Interfaces:**
- Consumes: none.
- Produces: none consumed elsewhere — isolated visual change.

- [ ] **Step 1: Replace the brand badge**

In `frontend/src/pages/admin/Login.tsx`, change:

```tsx
          {/* Brand */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold text-xl leading-none">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">SurveyPanel</span>
          </div>
```

to:

```tsx
          {/* Brand */}
          <div className="flex items-center gap-3 mb-10">
            <img
              src="https://stage.airpronetworks.com/app/uploads/2026/07/logo-1.png"
              alt="AirPro"
              className="h-10 w-auto"
            />
          </div>
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 3: Manually verify in the browser**

Run: `cd frontend && npm run dev`, navigate to `/admin/login`, confirm the AirPro logo loads and renders at a reasonable size in place of the old badge.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/Login.tsx
git commit -m "feat: replace login page brand badge with AirPro logo"
```

---

### Task 11: Frontend — public form: render logo/footer, mobile touch-target polish

**Files:**
- Modify: `frontend/src/pages/public/DynamicForm.tsx:915-942` (Form Header)
- Modify: `frontend/src/pages/public/DynamicForm.tsx:944-992` (Progress step bubbles — touch target sizing)
- Modify: `frontend/src/pages/public/DynamicForm.tsx:1017-1077` (Navigation buttons — touch target sizing, footer text)

**Interfaces:**
- Consumes: `form.logo_url`, `form.footer_text` (Task 7, via `getPublicForm`).
- Produces: none consumed elsewhere.

- [ ] **Step 1: Render the form's logo, falling back to the existing gradient mark**

Change:

```tsx
        {/* ── Form Header ─────────────────────────────── */}
        <div className="text-center mb-8">
          {/* Brand mark */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200 mb-4">
            <span className="text-white font-black text-xl">E</span>
          </div>
```

to:

```tsx
        {/* ── Form Header ─────────────────────────────── */}
        <div className="text-center mb-8">
          {/* Brand mark */}
          {form.logo_url ? (
            <img
              src={form.logo_url}
              alt={form.title}
              className="inline-block h-14 w-14 object-contain rounded-2xl shadow-lg shadow-blue-200 mb-4 bg-white"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200 mb-4">
              <span className="text-white font-black text-xl">E</span>
            </div>
          )}
```

- [ ] **Step 2: Render the custom footer text, falling back to "Powered by Enquire"**

Change:

```tsx
        {/* ── Footer ─────────────────────────────────── */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by <span className="font-semibold text-gray-500">Enquire</span>
        </p>
```

to:

```tsx
        {/* ── Footer ─────────────────────────────────── */}
        <p className="text-center text-xs text-gray-400 mt-6">
          {form.footer_text ? (
            form.footer_text
          ) : (
            <>Powered by <span className="font-semibold text-gray-500">Enquire</span></>
          )}
        </p>
```

- [ ] **Step 3: Enlarge touch targets on the step bubbles for mobile**

Change:

```tsx
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
```

to:

```tsx
                    <div
                      className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
```

- [ ] **Step 4: Enlarge touch targets on Back/Continue/Submit buttons for mobile**

Change all three button `className` values in the Navigation Buttons section from `px-5 py-3` / `px-6 py-3` / `px-8 py-3` to include a taller mobile tap target. Specifically, change:

```tsx
                    className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
```

to:

```tsx
                    className="flex items-center gap-2 px-5 py-3.5 sm:py-3 min-h-[44px] text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
```

Change:

```tsx
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-200 transition"
```

to:

```tsx
                    className="flex items-center gap-2 px-6 py-3.5 sm:py-3 min-h-[44px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-200 transition"
```

Change:

```tsx
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
```

to:

```tsx
                    className="flex items-center gap-2 px-8 py-3.5 sm:py-3 min-h-[44px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
```

- [ ] **Step 5: Type-check**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 6: Manually verify in the browser (desktop + mobile viewport)**

Run: `cd frontend && npm run dev`, open a public form URL (`/f/<slug>`):
1. With a logo set on that form (from Task 9), confirm it renders in the header instead of the "E" mark; with no logo, confirm the fallback still renders.
2. With custom footer text set, confirm it replaces "Powered by Enquire"; clear it and confirm the fallback returns.
3. Using browser dev tools' mobile emulation (e.g. iPhone SE width), confirm step bubbles and Back/Continue/Submit buttons are comfortably tappable (visually ~44px tall) and nothing overlaps or overflows horizontally.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/public/DynamicForm.tsx
git commit -m "feat: render per-form logo/footer and improve mobile touch targets on public form"
```

---

### Task 12: Frontend — smoother thank-you redirect

**Files:**
- Modify: `frontend/src/pages/public/DynamicForm.tsx:840-848` (pass `redirectDelaySeconds` into navigation state)
- Modify: `frontend/src/pages/public/FormThankYou.tsx` (full rewrite of countdown/redirect logic)

**Interfaces:**
- Consumes: `result.redirect_delay_seconds` (Task 8's `submitPublicForm` return type).
- Produces: none consumed elsewhere.

- [ ] **Step 1: Pass the delay through from `DynamicForm`'s submit handler**

In `frontend/src/pages/public/DynamicForm.tsx`, change:

```tsx
      navigate(`/f/${slug}/thank-you`, {
        state: {
          formTitle: form.title,
          isRedirect: result.is_redirect,
          redirectUrl: result.redirect_url,
          submissionId: result.submission_id,
        },
      });
```

to:

```tsx
      navigate(`/f/${slug}/thank-you`, {
        state: {
          formTitle: form.title,
          isRedirect: result.is_redirect,
          redirectUrl: result.redirect_url,
          redirectDelaySeconds: result.redirect_delay_seconds,
          submissionId: result.submission_id,
        },
      });
```

- [ ] **Step 2: Rewrite `FormThankYou.tsx` with a configurable delay, animated progress, and a fade-out transition before navigating**

Replace the full contents of `frontend/src/pages/public/FormThankYou.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';

interface ThankYouState {
  formTitle?: string;
  isRedirect?: boolean;
  redirectUrl?: string;
  redirectDelaySeconds?: number;
  submissionId?: string;
}

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

export default function FormThankYou() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as ThankYouState;
  const totalSeconds = Math.max(0, state.redirectDelaySeconds ?? 5);
  const [remainingMs, setRemainingMs] = useState(totalSeconds * 1000);
  const [fadingOut, setFadingOut] = useState(false);

  const shouldRedirect = state.isRedirect && !!state.redirectUrl;

  useEffect(() => {
    if (!shouldRedirect) return;

    if (totalSeconds === 0) {
      setFadingOut(true);
      const t = setTimeout(() => doRedirect(state.redirectUrl!), 200);
      return () => clearTimeout(t);
    }

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const remaining = Math.max(0, totalSeconds * 1000 - (Date.now() - startedAt));
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setFadingOut(true);
        setTimeout(() => doRedirect(state.redirectUrl!), 200);
      }
    }, 100);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRedirect, totalSeconds]);

  const doRedirect = (url: string) => {
    if (isSameOrigin(url)) {
      const target = new URL(url, window.location.origin);
      navigate(target.pathname + target.search + target.hash);
    } else {
      window.location.href = url;
    }
  };

  const progress = totalSeconds > 0 ? Math.max(0, Math.min(100, (remainingMs / (totalSeconds * 1000)) * 100)) : 0;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div
        className={`w-full max-w-md text-center transition-opacity duration-200 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Success icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank You!</h2>
          <p className="text-gray-500 text-sm mb-6">
            {state.formTitle
              ? `Your response to "${state.formTitle}" has been submitted successfully.`
              : 'Your response has been submitted successfully.'}
          </p>

          {shouldRedirect ? (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-700 mb-2">
                  {totalSeconds === 0
                    ? 'Redirecting...'
                    : <>You will be redirected in <strong>{secondsLeft}</strong> second{secondsLeft !== 1 ? 's' : ''}...</>}
                </p>
                <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${progress}%`, transition: 'width 100ms linear' }}
                  />
                </div>
              </div>
              <a
                href={state.redirectUrl}
                className="inline-block text-sm text-blue-600 hover:underline"
              >
                Click here if not redirected automatically
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {slug && (
                <Link
                  to={`/f/${slug}`}
                  className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition text-sm"
                >
                  Submit Another Response
                </Link>
              )}
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-400 mt-6">Powered by Enquire</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manually verify in the browser**

Run: `cd frontend && npm run dev`. Using a form with Redirect enabled (from Task 9):
1. Set redirect delay to `3`, submit the form, confirm the thank-you page counts down from 3 with a shrinking progress bar, then fades out and navigates.
2. Set redirect delay to `0`, submit again, confirm it fades and redirects almost immediately without showing a stale "in 5 seconds" message.
3. Set the redirect URL to a path on the same dev origin (e.g. `/f/<same-slug>`), submit, and confirm the URL bar changes without a full-page reload (check the Network tab shows no new document request).
4. Set the redirect URL to an external site, submit, and confirm it still redirects correctly (full navigation is expected here).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/public/DynamicForm.tsx frontend/src/pages/public/FormThankYou.tsx
git commit -m "feat: configurable, smoother redirect countdown on thank-you page"
```

---

### Task 13: Frontend — submissions: search & filter bar

**Files:**
- Modify: `frontend/src/pages/admin/FormSubmissions.tsx:208-230` (state + `fetchSubmissions`)
- Modify: `frontend/src/pages/admin/FormSubmissions.tsx:250-291` (page header area — add filter bar)

**Interfaces:**
- Consumes: `api.getFormSubmissions(id, params)` (existing, now filter-aware per Task 5).
- Produces: `searchTerm`, `statusFilter`, `dateFrom`, `dateTo` state — consumed by Task 14 (bulk action bar needs to know current filtered `data.results`) and Task 15 (mobile card layout reads the same `data`).

- [ ] **Step 1: Add filter state and include it in the fetch call**

Change:

```tsx
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
```

to:

```tsx
export default function FormSubmissions() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PaginatedResponse<FormSubmissionListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, page, searchTerm, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, dateFrom, dateTo]);

  const fetchSubmissions = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.submitted_after = dateFrom;
      if (dateTo) params.submitted_before = dateTo;
      const result = await api.getFormSubmissions(id, params);
      setData(result);
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = !!(searchTerm.trim() || statusFilter || dateFrom || dateTo);
```

- [ ] **Step 2: Add the filter bar UI**

Directly after the page header `</div>` (the one closing `{/* ── Page header ─────────────────────────────── */}`) and before `{/* ── Table card ─────────────────────────────── */}`, add:

```tsx
      {/* ── Search & Filter bar ─────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by city, country, or answer text…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="reviewed">Reviewed</option>
          <option value="archived">Archived</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="To date"
        />
        {hasActiveFilters && (
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); }}
            className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition"
          >
            Clear filters
          </button>
        )}
      </div>
```

- [ ] **Step 3: Distinguish the "no results for filters" empty state from "no submissions yet"**

Change:

```tsx
        ) : !data || data.results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-700">No submissions yet</p>
            <p className="text-sm text-gray-400">Share your form to start collecting responses.</p>
          </div>
        ) : (
```

to:

```tsx
        ) : !data || data.results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            {hasActiveFilters ? (
              <>
                <p className="font-semibold text-gray-700">No matching submissions</p>
                <p className="text-sm text-gray-400">Try adjusting your search or filters.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-700">No submissions yet</p>
                <p className="text-sm text-gray-400">Share your form to start collecting responses.</p>
              </>
            )}
          </div>
        ) : (
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 5: Manually verify in the browser**

Run: `cd frontend && npm run dev`, open a form's Submissions page with several submissions across different cities/statuses:
1. Type a search term matching one submission's city — confirm the table narrows to matching rows.
2. Pick a status filter — confirm only matching rows show.
3. Combine search + status + date range — confirm filters compose (AND, not OR).
4. Clear filters — confirm the full list returns and "Clear filters" button disappears.
5. Search for nonsense text — confirm the "No matching submissions" empty state (not "No submissions yet") appears.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/FormSubmissions.tsx
git commit -m "feat: add search and status/date filtering to submissions list"
```

---

### Task 14: Frontend — submissions: row selection & bulk action bar

**Files:**
- Modify: `frontend/src/pages/admin/FormSubmissions.tsx` (table head/body — checkboxes; new floating action bar; new confirm-delete modal)

**Interfaces:**
- Consumes: `api.bulkUpdateSubmissions` (Task 8), `ConfirmModal` (existing component), `data`/`fetchSubmissions` from Task 13.
- Produces: none consumed elsewhere.

- [ ] **Step 1: Import `ConfirmModal` and add selection state**

Change the imports at the top of `frontend/src/pages/admin/FormSubmissions.tsx` from:

```tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as api from '../../api/endpoints';
import type {
  FormSubmissionListItem,
  FormSubmissionDetail as SubmissionDetailType,
  PaginatedResponse,
} from '../../types';
```

to:

```tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as api from '../../api/endpoints';
import ConfirmModal from '../../components/ui/ConfirmModal';
import type {
  FormSubmissionListItem,
  FormSubmissionDetail as SubmissionDetailType,
  PaginatedResponse,
} from '../../types';
```

In the main component, directly after the `dateTo` state line, add:

```tsx
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
```

Directly after the `hasActiveFilters` line, add:

```tsx
  const toggleSelect = (subId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(subId)) next.delete(subId);
      else next.add(subId);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    if (!data) return;
    const pageIds = data.results.map((s) => s.id);
    const allSelected = pageIds.every((pid) => selectedIds.has(pid));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((pid) => next.delete(pid));
      else pageIds.forEach((pid) => next.add(pid));
      return next;
    });
  };

  const handleBulkMarkReviewed = async () => {
    if (!id || selectedIds.size === 0) return;
    setBulkActing(true);
    try {
      await api.bulkUpdateSubmissions(id, Array.from(selectedIds), 'set_status', 'reviewed');
      toast.success(`Marked ${selectedIds.size} submission(s) as reviewed`);
      setSelectedIds(new Set());
      await fetchSubmissions();
    } catch {
      toast.error('Failed to update submissions');
    } finally {
      setBulkActing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!id || selectedIds.size === 0) return;
    setBulkActing(true);
    try {
      await api.bulkUpdateSubmissions(id, Array.from(selectedIds), 'delete');
      toast.success(`Deleted ${selectedIds.size} submission(s)`);
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
      await fetchSubmissions();
    } catch {
      toast.error('Failed to delete submissions');
    } finally {
      setBulkActing(false);
    }
  };
```

- [ ] **Step 2: Add a checkbox column to the table header and rows**

Change the table head from:

```tsx
                <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-500">#</th>
```

to:

```tsx
                <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={data.results.length > 0 && data.results.every((s) => selectedIds.has(s.id))}
                      onChange={toggleSelectAllOnPage}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label="Select all on this page"
                    />
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-500">#</th>
```

Change the row start from:

```tsx
                  <tr
                    key={sub.id}
                    className="hover:bg-blue-50/40 transition-colors duration-150 cursor-pointer"
                    onClick={() => setSelectedSub(sub.id)}
                  >
                    {/* Row number */}
                    <td className="px-5 py-4">
```

to:

```tsx
                  <tr
                    key={sub.id}
                    className={`hover:bg-blue-50/40 transition-colors duration-150 cursor-pointer ${selectedIds.has(sub.id) ? 'bg-blue-50/60' : ''}`}
                    onClick={() => setSelectedSub(sub.id)}
                  >
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(sub.id)}
                        onChange={() => toggleSelect(sub.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Select submission ${sub.id}`}
                      />
                    </td>
                    {/* Row number */}
                    <td className="px-5 py-4">
```

- [ ] **Step 3: Add the floating bulk action bar and confirm-delete modal**

Directly before the closing `{/* Detail Drawer */}` comment near the end of the component's return statement, add:

```tsx
      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <button
            onClick={handleBulkMarkReviewed}
            disabled={bulkActing}
            className="text-sm font-semibold text-emerald-300 hover:text-emerald-200 disabled:opacity-50"
          >
            Mark reviewed
          </button>
          <button
            onClick={() => setConfirmBulkDelete(true)}
            disabled={bulkActing}
            className="text-sm font-semibold text-red-300 hover:text-red-200 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
        </div>
      )}

      <ConfirmModal
        open={confirmBulkDelete}
        title="Delete selected submissions?"
        message={`This will permanently delete ${selectedIds.size} submission(s). This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={bulkActing}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 5: Manually verify in the browser**

Run: `cd frontend && npm run dev`, open a form's Submissions page with several submissions:
1. Select a few rows individually — confirm the floating bar appears with the correct count and selected rows are highlighted.
2. Use "select all on this page" — confirm it toggles all rows on the current page (not other pages).
3. Click "Mark reviewed" — confirm the status badges update after refetch and the bar disappears.
4. Select rows again, click "Delete", confirm the `ConfirmModal` appears, confirm deletion removes the rows and updates the total count.
5. Confirm clicking a row still opens the detail drawer (checkbox clicks must not trigger it — verify via the `stopPropagation` on the checkbox `<td>`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/FormSubmissions.tsx
git commit -m "feat: add row selection and bulk delete/mark-reviewed actions to submissions"
```

---

### Task 15: Frontend — submissions: mobile card layout

**Files:**
- Modify: `frontend/src/pages/admin/FormSubmissions.tsx` (table wrapper — add a parallel mobile card list, hide table below `md`)

**Interfaces:**
- Consumes: `data`, `selectedIds`, `toggleSelect`, `setSelectedSub` (Tasks 13-14).
- Produces: none consumed elsewhere.

- [ ] **Step 1: Wrap the existing table so it's desktop-only, and add a mobile card list**

Change the table wrapper's opening tag from:

```tsx
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
```

to:

```tsx
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
```

Directly after that table's closing `</div>` (the one matching `overflow-x-auto`), and still inside the same parent conditional block (the `) : (` branch that renders when `data.results.length > 0`), add the mobile card list:

```tsx
          <div className="md:hidden divide-y divide-gray-100">
            {data.results.map((sub, idx) => (
              <div
                key={sub.id}
                className={`p-4 flex gap-3 ${selectedIds.has(sub.id) ? 'bg-blue-50/60' : ''}`}
                onClick={() => setSelectedSub(sub.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(sub.id)}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(sub.id); }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  aria-label={`Select submission ${sub.id}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs font-semibold text-slate-700 truncate">
                      {sub.ip_address || 'Unknown IP'}
                    </p>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${
                      sub.status === 'reviewed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : sub.status === 'archived'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      <span className="capitalize">{sub.status}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {[sub.city, sub.country].filter(Boolean).join(', ') || 'Unknown Location'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-500">
                      {new Date(sub.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' · '}
                      {new Date(sub.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className="text-xs font-bold text-gray-300">
                      #{(page - 1) * 20 + idx + 1}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 3: Manually verify in the browser (mobile viewport)**

Run: `cd frontend && npm run dev`, open a form's Submissions page, switch dev tools to a mobile width (e.g. 375px):
1. Confirm the table disappears and a stacked card list appears instead, with no horizontal scrolling.
2. Confirm tapping a card (outside the checkbox) opens the detail drawer.
3. Confirm tapping the checkbox selects the row and surfaces the floating bulk action bar, without opening the drawer.
4. Widen the viewport past the `md` breakpoint and confirm the table reappears and the card list disappears.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/FormSubmissions.tsx
git commit -m "feat: add mobile card layout for submissions list"
```

---

### Task 16: Frontend — submissions: loading skeletons

**Files:**
- Modify: `frontend/src/pages/admin/FormSubmissions.tsx` (loading branch of the table card)

**Interfaces:**
- Consumes: `loading` state (existing).
- Produces: none consumed elsewhere.

- [ ] **Step 1: Replace the spinner with skeleton rows**

Change:

```tsx
        {loading ? (
          <div className="flex flex-col items-center justify-center h-52 gap-3">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600" />
            <p className="text-sm text-gray-400">Loading submissions…</p>
          </div>
        ) : !data || data.results.length === 0 ? (
```

to:

```tsx
        {loading ? (
          <div className="divide-y divide-gray-50 animate-pulse">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="h-4 w-4 bg-gray-200 rounded flex-shrink-0" />
                <div className="h-8 w-8 bg-gray-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="h-5 w-16 bg-gray-200 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : !data || data.results.length === 0 ? (
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 3: Manually verify in the browser**

Run: `cd frontend && npm run dev`, throttle the network in dev tools (e.g. "Slow 3G") and reload a form's Submissions page — confirm the skeleton rows render briefly instead of a blank card, then the real table/cards replace them once data arrives.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/FormSubmissions.tsx
git commit -m "feat: add loading skeleton rows to submissions list"
```

---

### Task 17: Frontend — dashboard visual polish

**Files:**
- Modify: `frontend/src/pages/admin/Dashboard.tsx:221-227` (loading state)

**Interfaces:**
- Consumes: `loading`, `data` (existing).
- Produces: none consumed elsewhere.

- [ ] **Step 1: Read the current loading block to confirm exact surrounding lines**

Run: `sed -n '195,235p' frontend/src/pages/admin/Dashboard.tsx` (or open the file) and confirm the block matches:

```tsx
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
```

(Exact surrounding JSX may differ slightly — match on the `animate-spin` + `border-b-2 border-blue-600` spinner, which is the one to replace.)

- [ ] **Step 2: Replace the single spinner with a skeleton layout matching the real dashboard structure**

Replace that block with:

```tsx
  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-7 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
              <div className="w-11 h-11 bg-gray-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 bg-gray-200 rounded w-2/3" />
                <div className="h-5 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm h-72" />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm h-72" />
        </div>
      </div>
    );
  }
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manually verify in the browser**

Run: `cd frontend && npm run dev`, throttle the network in dev tools and load `/admin/dashboard` — confirm a skeleton resembling the stat-card grid and chart panels appears briefly instead of a single centered spinner, then the real dashboard replaces it once data arrives. Confirm no layout shift/flash once real content loads (skeleton grid dimensions should roughly match the real one).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/Dashboard.tsx
git commit -m "feat: replace dashboard spinner with structure-matching loading skeleton"
```

---

## Post-Implementation Full Verification

After all 17 tasks are complete:

- [ ] Run the full backend test suite: `cd backend && python manage.py test form_builder -v 2` — expect all tests passing, `OK`.
- [ ] Run the full frontend type-check + build: `cd frontend && npm run build` — expect success with no errors.
- [ ] Manual end-to-end pass per the design spec's Testing section: logo upload/remove round-trip, footer text rendering, login logo, submissions search/filter/bulk actions and mobile card layout, dashboard skeletons, thank-you redirect timing/animation — on both a desktop-width and mobile-width browser viewport.
