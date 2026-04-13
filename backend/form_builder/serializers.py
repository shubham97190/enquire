from rest_framework import serializers
from django.utils.text import slugify

from .models import (
    EnquiryForm,
    EnquiryFormField,
    EnquirySubmission,
    EnquirySubmissionAnswer,
    FieldType,
)


# ──────────────────────────────────────────────
# Form Field Serializers
# ──────────────────────────────────────────────

class EnquiryFormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnquiryFormField
        fields = [
            'id', 'label', 'slug', 'field_type', 'placeholder', 'help_text',
            'is_required', 'is_active', 'sort_order', 'default_value',
            'options', 'validation_rules', 'min_length', 'max_length',
            'min_value', 'max_value', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def validate_field_type(self, value):
        valid = [c[0] for c in FieldType.choices]
        if value not in valid:
            raise serializers.ValidationError(f'Invalid field type. Choose from: {", ".join(valid)}')
        return value

    def validate_options(self, value):
        if value and not isinstance(value, list):
            raise serializers.ValidationError('Options must be a list.')
        return value


class EnquiryFormFieldCreateSerializer(serializers.ModelSerializer):
    """For creating a single field — form is set in the view."""
    class Meta:
        model = EnquiryFormField
        fields = [
            'id', 'label', 'field_type', 'placeholder', 'help_text',
            'is_required', 'is_active', 'sort_order', 'default_value',
            'options', 'validation_rules', 'min_length', 'max_length',
            'min_value', 'max_value',
        ]
        read_only_fields = ['id']


# ──────────────────────────────────────────────
# Form Serializers
# ──────────────────────────────────────────────

class EnquiryFormListSerializer(serializers.ModelSerializer):
    field_count = serializers.IntegerField(read_only=True)
    submission_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = EnquiryForm
        fields = [
            'id', 'title', 'slug', 'is_active', 'is_redirect', 'redirect_url',
            'field_count', 'submission_count', 'created_at', 'updated_at',
        ]


class EnquiryFormDetailSerializer(serializers.ModelSerializer):
    fields = EnquiryFormFieldSerializer(many=True, read_only=True)
    submission_count = serializers.SerializerMethodField()
    qr_code_url = serializers.SerializerMethodField()

    class Meta:
        model = EnquiryForm
        fields = [
            'id', 'title', 'slug', 'description', 'unicode_text',
            'is_active', 'is_redirect', 'redirect_url',
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


class EnquiryFormCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnquiryForm
        fields = [
            'id', 'title', 'description', 'unicode_text',
            'is_active', 'is_redirect', 'redirect_url',
        ]
        read_only_fields = ['id']

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Title must be at least 2 characters.')
        return value


# ──────────────────────────────────────────────
# Public Form Serializers
# ──────────────────────────────────────────────

class PublicFormFieldSerializer(serializers.ModelSerializer):
    """Read-only field info for public form rendering."""
    class Meta:
        model = EnquiryFormField
        fields = [
            'id', 'label', 'slug', 'field_type', 'placeholder', 'help_text',
            'is_required', 'is_active', 'sort_order', 'default_value', 'options',
            'min_length', 'max_length', 'min_value', 'max_value',
        ]


class PublicFormSerializer(serializers.ModelSerializer):
    """Read-only form for public rendering."""

    class Meta:
        model = EnquiryForm
        fields = [
            'id', 'title', 'slug', 'description', 'unicode_text',
            'is_redirect', 'redirect_url',
        ]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        active_fields = instance.fields.filter(is_active=True).order_by('sort_order', 'created_at')
        rep['fields'] = PublicFormFieldSerializer(active_fields, many=True).data
        return rep


class PublicSubmissionSerializer(serializers.Serializer):
    """Accepts submission data from the public form."""
    answers = serializers.DictField(child=serializers.CharField(allow_blank=True), required=True)
    answers_json = serializers.DictField(required=False, default=dict)
    device_info = serializers.DictField(required=False, default=dict)
    location_info = serializers.DictField(required=False, default=dict)

    def validate_answers(self, value):
        if not value:
            raise serializers.ValidationError('Answers cannot be empty.')
        return value


# ──────────────────────────────────────────────
# Submission Serializers
# ──────────────────────────────────────────────

class SubmissionAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnquirySubmissionAnswer
        fields = [
            'id', 'question', 'question_label_snapshot',
            'question_type_snapshot', 'answer_value', 'answer_json',
            'created_at',
        ]


class SubmissionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnquirySubmission
        fields = [
            'id', 'submitted_at', 'ip_address', 'city', 'region',
            'country', 'device_type', 'browser_name', 'os_name',
            'is_mobile', 'status',
        ]


class SubmissionDetailSerializer(serializers.ModelSerializer):
    answers = SubmissionAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = EnquirySubmission
        fields = [
            'id', 'form', 'submitted_at', 'ip_address',
            'city', 'region', 'country', 'loc', 'org', 'postal', 'timezone',
            'device_type', 'device_brand', 'browser_name', 'os_name',
            'is_mobile', 'is_tablet', 'is_desktop', 'is_android', 'is_ios',
            'is_chrome', 'is_edge', 'user_agent', 'raw_device_info',
            'raw_location_info', 'status', 'answers',
        ]


# ──────────────────────────────────────────────
# Bulk Fields Update (reorder / batch save)
# ──────────────────────────────────────────────

class BulkFieldUpdateSerializer(serializers.Serializer):
    """Accepts a list of field objects to bulk-update sort_order and properties."""
    fields = EnquiryFormFieldSerializer(many=True)
