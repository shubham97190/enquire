import logging

from django.db.models import Count, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.views import IsAdminUser
from .models import (
    EnquiryForm,
    EnquiryFormField,
    EnquirySubmission,
    EnquirySubmissionAnswer,
    FieldType,
)
from .serializers import (
    EnquiryFormListSerializer,
    EnquiryFormDetailSerializer,
    EnquiryFormCreateUpdateSerializer,
    EnquiryFormFieldSerializer,
    EnquiryFormFieldCreateSerializer,
    PublicFormSerializer,
    PublicSubmissionSerializer,
    SubmissionListSerializer,
    SubmissionDetailSerializer,
)
from .utils import (
    generate_form_qr_code,
    get_unique_slug,
    get_duplicate_title,
)
from .export import generate_submissions_xlsx

logger = logging.getLogger(__name__)

# Non-input field types that don't store answers
NON_INPUT_TYPES = {FieldType.SECTION_HEADING, FieldType.DESCRIPTION_BLOCK}


# ──────────────────────────────────────────────
# ADMIN: Dashboard
# ──────────────────────────────────────────────

class AdminFormsDashboardView(APIView):
    """Admin: Summary stats and trends for the forms dashboard.
    SUPER_ADMIN sees all data; STAFF sees only data for their own forms.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        user = request.user
        is_super_admin = user.is_super_admin

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = now - timezone.timedelta(days=30)
        twelve_months_ago = now - timezone.timedelta(days=365)

        # Scope querysets to user's own forms for STAFF
        forms_qs = EnquiryForm.objects.all() if is_super_admin else EnquiryForm.objects.filter(created_by=user)
        submissions_qs = (
            EnquirySubmission.objects.all()
            if is_super_admin
            else EnquirySubmission.objects.filter(form__created_by=user)
        )

        total_forms = forms_qs.count()
        active_forms = forms_qs.filter(is_active=True).count()
        inactive_forms = total_forms - active_forms

        total_submissions = submissions_qs.count()
        today_submissions = submissions_qs.filter(submitted_at__gte=today_start).count()
        monthly_submissions = submissions_qs.filter(submitted_at__gte=month_start).count()

        # Daily trend (last 30 days)
        daily_trend = list(
            submissions_qs
            .filter(submitted_at__gte=thirty_days_ago)
            .annotate(date=TruncDate('submitted_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        for item in daily_trend:
            item['date'] = item['date'].isoformat()

        # Monthly trend (last 12 months)
        monthly_trend = list(
            submissions_qs
            .filter(submitted_at__gte=twelve_months_ago)
            .annotate(month=TruncMonth('submitted_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        for item in monthly_trend:
            item['month'] = item['month'].isoformat()

        # Top surveys by submission count
        top_forms_qs = (
            forms_qs
            .annotate(submission_count=Count('submissions'))
            .order_by('-submission_count')[:6]
            .values('id', 'title', 'submission_count')
        )
        top_forms = [
            {
                'form_id': str(item['id']),
                'form_title': item['title'],
                'submission_count': item['submission_count'],
            }
            for item in top_forms_qs
        ]

        # Recent surveys (latest 8 created)
        recent_forms_qs = (
            forms_qs
            .annotate(
                field_count=Count('fields', filter=Q(fields__is_active=True)),
                submission_count=Count('submissions'),
            )
            .order_by('-created_at')[:8]
        )
        recent_forms = [
            {
                'id': str(f.id),
                'title': f.title,
                'slug': f.slug,
                'is_active': f.is_active,
                'field_count': f.field_count,
                'submission_count': f.submission_count,
                'created_at': f.created_at.isoformat(),
            }
            for f in recent_forms_qs
        ]

        # Device breakdown
        device_breakdown = list(
            submissions_qs
            .exclude(device_type='')
            .values('device_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        return Response({
            'total_forms': total_forms,
            'active_forms': active_forms,
            'inactive_forms': inactive_forms,
            'total_submissions': total_submissions,
            'today_submissions': today_submissions,
            'monthly_submissions': monthly_submissions,
            'daily_trend': daily_trend,
            'monthly_trend': monthly_trend,
            'top_forms': top_forms,
            'recent_forms': recent_forms,
            'device_breakdown': device_breakdown,
        })


# ──────────────────────────────────────────────
# PUBLIC VIEWS
# ──────────────────────────────────────────────

class PublicFormView(APIView):
    """Public: Fetch form by slug for rendering."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            form = EnquiryForm.objects.prefetch_related('fields').get(slug=slug)
        except EnquiryForm.DoesNotExist:
            return Response({'detail': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not form.is_active:
            return Response(
                {'detail': 'This form is currently inactive.', 'is_inactive': True},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = PublicFormSerializer(form)
        return Response(serializer.data)


class PublicFormSubmitView(APIView):
    """Public: Submit answers for a form."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'anon'

    def post(self, request, slug):
        try:
            form = EnquiryForm.objects.prefetch_related('fields').get(slug=slug)
        except EnquiryForm.DoesNotExist:
            return Response({'detail': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not form.is_active:
            return Response({'detail': 'This form is currently inactive.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = PublicSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answers_raw = serializer.validated_data['answers']
        answers_json_raw = serializer.validated_data.get('answers_json', {})
        device_info = serializer.validated_data.get('device_info', {})
        location_info = serializer.validated_data.get('location_info', {})

        # Validate required fields
        active_fields = {
            str(f.id): f
            for f in form.fields.filter(is_active=True)
            if f.field_type not in NON_INPUT_TYPES
        }
        errors = {}
        for field_id, field in active_fields.items():
            val = answers_raw.get(field_id, '').strip()
            if field.is_required and not val and field_id not in answers_json_raw:
                errors[field_id] = f'{field.label} is required.'
        if errors:
            return Response({'field_errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        def _bool(v):
            if isinstance(v, bool):
                return v
            return str(v).lower() == 'true'

        # Build submission using frontend-provided device and location data
        submission = EnquirySubmission.objects.create(
            form=form,
            ip_address=location_info.get('ip') or None,
            city=location_info.get('city', ''),
            region=location_info.get('region', ''),
            country=location_info.get('country', ''),
            loc=location_info.get('loc', ''),
            org=location_info.get('org', ''),
            postal=location_info.get('postal', ''),
            timezone=location_info.get('timezone', ''),
            raw_location_info=location_info,
            device_type=str(device_info.get('deviceType', device_info.get('device_type', ''))),
            device_brand=str(device_info.get('deviceBrand', device_info.get('device_brand', ''))),
            browser_name=str(device_info.get('browserName', device_info.get('browser_name', ''))),
            os_name=str(device_info.get('osName', device_info.get('os_name', ''))),
            is_mobile=_bool(device_info.get('is_mobile', False)),
            is_tablet=_bool(device_info.get('is_tablet', False)),
            is_desktop=_bool(device_info.get('isDesktop', device_info.get('is_desktop', False))),
            is_android=_bool(device_info.get('is_android', False)),
            is_ios=_bool(device_info.get('is_ios', False)),
            is_chrome=_bool(device_info.get('is_chrome', False)),
            is_edge=_bool(device_info.get('is_edge', False)),
            user_agent=str(device_info.get('userAgent', device_info.get('user_agent', ''))),
            raw_device_info=device_info,
        )

        # Create answer records with label snapshots
        answer_objects = []
        for field_id, field in active_fields.items():
            answer_value = answers_raw.get(field_id, '')
            answer_json = answers_json_raw.get(field_id) if field_id in answers_json_raw else None
            answer_objects.append(EnquirySubmissionAnswer(
                submission=submission,
                question=field,
                question_label_snapshot=field.label,
                question_type_snapshot=field.field_type,
                answer_value=answer_value,
                answer_json=answer_json,
            ))
        EnquirySubmissionAnswer.objects.bulk_create(answer_objects)

        resp = {
            'detail': 'Form submitted successfully.',
            'submission_id': str(submission.id),
            'is_redirect': form.is_redirect,
            'redirect_url': form.redirect_url if form.is_redirect else '',
        }
        return Response(resp, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────
# ADMIN: Form CRUD
# ──────────────────────────────────────────────

class AdminFormListCreateView(generics.ListCreateAPIView):
    """Admin: List all forms / Create a new form.
    SUPER_ADMIN sees all forms; STAFF sees only forms they created.
    """
    permission_classes = [IsAdminUser]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        base_qs = EnquiryForm.objects.annotate(
            field_count=Count('fields', filter=Q(fields__is_active=True)),
            submission_count=Count('submissions'),
        ).order_by('-created_at')

        if user.is_super_admin:
            return base_qs
        # STAFF only see forms they created
        return base_qs.filter(created_by=user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EnquiryFormCreateUpdateSerializer
        return EnquiryFormListSerializer

    def perform_create(self, serializer):
        form = serializer.save(created_by=self.request.user)
        form.slug = get_unique_slug(form.title, exclude_id=form.pk)
        generate_form_qr_code(form)
        form.save()

    def create(self, request, *args, **kwargs):
        serializer = EnquiryFormCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        detail = EnquiryFormDetailSerializer(serializer.instance, context={'request': request})
        return Response(detail.data, status=status.HTTP_201_CREATED)


class AdminFormDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: Get / Update / Delete a form.
    SUPER_ADMIN can access any form; STAFF can only access forms they created.
    """
    permission_classes = [IsAdminUser]
    queryset = EnquiryForm.objects.prefetch_related('fields')
    lookup_field = 'pk'

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if not user.is_super_admin and obj.created_by != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not have permission to access this form.')
        return obj

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return EnquiryFormCreateUpdateSerializer
        return EnquiryFormDetailSerializer

    def perform_update(self, serializer):
        instance = serializer.save()
        # Regenerate slug if title changed
        if 'title' in serializer.validated_data:
            instance.slug = get_unique_slug(instance.title, exclude_id=instance.pk)
            generate_form_qr_code(instance)
            instance.save()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = EnquiryFormCreateUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        detail = EnquiryFormDetailSerializer(serializer.instance, context={'request': request})
        return Response(detail.data)


class AdminFormDuplicateView(APIView):
    """Admin: Duplicate a form (copies form + fields, not submissions)."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            original = EnquiryForm.objects.prefetch_related('fields').get(pk=pk)
        except EnquiryForm.DoesNotExist:
            return Response({'detail': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_super_admin and original.created_by != request.user:
            return Response({'detail': 'You do not have permission to duplicate this form.'}, status=status.HTTP_403_FORBIDDEN)

        new_title = get_duplicate_title(original.title)
        new_slug = get_unique_slug(new_title)

        new_form = EnquiryForm.objects.create(
            title=new_title,
            slug=new_slug,
            description=original.description,
            unicode_text=original.unicode_text,
            is_active=False,  # duplicated forms start inactive
            is_redirect=original.is_redirect,
            redirect_url=original.redirect_url,
            created_by=request.user,
        )
        generate_form_qr_code(new_form)
        new_form.save()

        # Copy fields
        for field in original.fields.all().order_by('sort_order', 'created_at'):
            EnquiryFormField.objects.create(
                form=new_form,
                label=field.label,
                field_type=field.field_type,
                placeholder=field.placeholder,
                help_text=field.help_text,
                is_required=field.is_required,
                is_active=field.is_active,
                sort_order=field.sort_order,
                default_value=field.default_value,
                options=field.options,
                validation_rules=field.validation_rules,
                min_length=field.min_length,
                max_length=field.max_length,
                min_value=field.min_value,
                max_value=field.max_value,
            )

        detail = EnquiryFormDetailSerializer(new_form, context={'request': request})
        return Response(detail.data, status=status.HTTP_201_CREATED)


# ──────────────────────────────────────────────
# ADMIN: Form Fields
# ──────────────────────────────────────────────

class AdminFormFieldCreateView(generics.CreateAPIView):
    """Admin: Add a field to a form."""
    permission_classes = [IsAdminUser]
    serializer_class = EnquiryFormFieldCreateSerializer

    def _get_form_or_error(self, pk, user):
        try:
            form = EnquiryForm.objects.get(pk=pk)
        except EnquiryForm.DoesNotExist:
            return None, Response({'detail': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not user.is_super_admin and form.created_by != user:
            return None, Response({'detail': 'You do not have permission to modify this form.'}, status=status.HTTP_403_FORBIDDEN)
        return form, None

    def perform_create(self, serializer):
        form, _ = self._get_form_or_error(self.kwargs['pk'], self.request.user)
        if form:
            serializer.save(form=form)

    def create(self, request, *args, **kwargs):
        form, err = self._get_form_or_error(self.kwargs['pk'], request.user)
        if err:
            return err

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(form=form)
        return Response(
            EnquiryFormFieldSerializer(serializer.instance).data,
            status=status.HTTP_201_CREATED,
        )


class AdminFormFieldDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: Get / Update / Delete a single field."""
    permission_classes = [IsAdminUser]
    serializer_class = EnquiryFormFieldSerializer
    queryset = EnquiryFormField.objects.select_related('form')
    lookup_field = 'pk'
    lookup_url_kwarg = 'field_pk'

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if not user.is_super_admin and obj.form.created_by != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not have permission to modify this field.')
        return obj


class AdminFormFieldsBulkView(APIView):
    """Admin: Bulk update fields (reorder, edit multiple at once)."""
    permission_classes = [IsAdminUser]

    def put(self, request, pk):
        try:
            form = EnquiryForm.objects.get(pk=pk)
        except EnquiryForm.DoesNotExist:
            return Response({'detail': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_super_admin and form.created_by != request.user:
            return Response({'detail': 'You do not have permission to modify this form.'}, status=status.HTTP_403_FORBIDDEN)

        fields_data = request.data.get('fields', [])
        if not isinstance(fields_data, list):
            return Response({'detail': 'fields must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

        updated_fields = []
        for item in fields_data:
            field_id = item.get('id')
            if not field_id:
                continue
            try:
                field = EnquiryFormField.objects.get(pk=field_id, form=form)
            except EnquiryFormField.DoesNotExist:
                continue

            for attr in ['label', 'field_type', 'placeholder', 'help_text', 'is_required',
                         'is_active', 'sort_order', 'default_value', 'options',
                         'validation_rules', 'min_length', 'max_length', 'min_value', 'max_value']:
                if attr in item:
                    setattr(field, attr, item[attr])
            field.save()
            updated_fields.append(field)

        serializer = EnquiryFormFieldSerializer(updated_fields, many=True)
        return Response(serializer.data)


# ──────────────────────────────────────────────
# ADMIN: Submissions
# ──────────────────────────────────────────────

class AdminFormSubmissionsView(generics.ListAPIView):
    """Admin: List submissions for a specific form.
    STAFF can only view submissions for forms they created.
    """
    permission_classes = [IsAdminUser]
    serializer_class = SubmissionListSerializer

    def get_queryset(self):
        user = self.request.user
        base = EnquirySubmission.objects.filter(form_id=self.kwargs['pk'])
        if not user.is_super_admin:
            base = base.filter(form__created_by=user)
        return base.order_by('-submitted_at')


class AdminFormSubmissionDetailView(generics.RetrieveAPIView):
    """Admin: View a single submission with all answers."""
    permission_classes = [IsAdminUser]
    serializer_class = SubmissionDetailSerializer
    queryset = EnquirySubmission.objects.prefetch_related('answers__question')
    lookup_field = 'pk'
    lookup_url_kwarg = 'sub_pk'


# ──────────────────────────────────────────────
# ADMIN: Reports
# ──────────────────────────────────────────────

class AdminFormReportView(APIView):
    """Admin: Aggregated report data for a form."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            form = EnquiryForm.objects.prefetch_related('fields').get(pk=pk)
        except EnquiryForm.DoesNotExist:
            return Response({'detail': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)

        submissions = EnquirySubmission.objects.filter(form=form)
        total = submissions.count()

        # Date-wise trend (last 30 days)
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        daily_trend = list(
            submissions.filter(submitted_at__gte=thirty_days_ago)
            .annotate(date=TruncDate('submitted_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        for item in daily_trend:
            item['date'] = item['date'].isoformat()

        # Device breakdown
        device_breakdown = list(
            submissions.values('device_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Browser breakdown
        browser_breakdown = list(
            submissions.values('browser_name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # OS breakdown
        os_breakdown = list(
            submissions.values('os_name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Location breakdown (top 10 cities)
        location_breakdown = list(
            submissions.exclude(city='')
            .values('city', 'country')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # Field-wise analytics for choice fields + rating + range_slider
        analytics_types = {'select', 'radio', 'checkbox', 'multi_checkbox', 'yes_no', 'rating', 'range_slider'}
        field_analytics = []
        analytics_fields = form.fields.filter(field_type__in=analytics_types, is_active=True)
        for field in analytics_fields:
            answers = EnquirySubmissionAnswer.objects.filter(
                question=field,
                submission__form=form,
            )
            distribution = list(
                answers.values('answer_value')
                .annotate(count=Count('id'))
                .order_by('-count')
            )
            field_analytics.append({
                'field_id': str(field.id),
                'label': field.label,
                'field_type': field.field_type,
                'distribution': distribution,
            })

        # Completion rates per field
        field_completion = []
        active_fields = form.fields.filter(is_active=True).exclude(
            field_type__in=['section_heading', 'description_block']
        )
        for field in active_fields:
            answered = EnquirySubmissionAnswer.objects.filter(
                question=field,
                submission__form=form,
            ).exclude(answer_value='').count()
            field_completion.append({
                'field_id': str(field.id),
                'label': field.label,
                'is_required': field.is_required,
                'answered': answered,
                'total': total,
                'rate': round(answered / total * 100, 1) if total > 0 else 0,
            })

        return Response({
            'form_title': form.title,
            'total_submissions': total,
            'daily_trend': daily_trend,
            'device_breakdown': device_breakdown,
            'browser_breakdown': browser_breakdown,
            'os_breakdown': os_breakdown,
            'location_breakdown': location_breakdown,
            'field_analytics': field_analytics,
            'field_completion': field_completion,
        })


class AdminFormSubmissionsExportView(APIView):
    """Admin: Export form submissions as XLSX."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            form = EnquiryForm.objects.prefetch_related('fields').get(pk=pk)
        except EnquiryForm.DoesNotExist:
            return Response({'detail': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)

        submissions = (
            EnquirySubmission.objects
            .filter(form=form)
            .prefetch_related('answers__question')
            .order_by('-submitted_at')
        )

        xlsx_buffer = generate_submissions_xlsx(form, submissions)

        from django.http import HttpResponse
        response = HttpResponse(
            xlsx_buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        filename = f"{form.slug}-submissions.xlsx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
