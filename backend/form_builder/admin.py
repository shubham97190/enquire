from django.contrib import admin
from .models import EnquiryForm, EnquiryFormField, EnquirySubmission, EnquirySubmissionAnswer


class EnquiryFormFieldInline(admin.TabularInline):
    model = EnquiryFormField
    extra = 0
    fields = ['label', 'field_type', 'is_required', 'is_active', 'sort_order']
    readonly_fields = ['slug']
    ordering = ['sort_order']


@admin.register(EnquiryForm)
class EnquiryFormAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'is_active', 'is_redirect', 'field_count', 'submission_count', 'created_at']
    list_filter = ['is_active', 'is_redirect', 'created_at']
    search_fields = ['title', 'slug']
    readonly_fields = ['id', 'slug', 'qr_code', 'created_at', 'updated_at']
    inlines = [EnquiryFormFieldInline]

    @admin.display(description='Fields')
    def field_count(self, obj):
        return obj.fields.filter(is_active=True).count()

    @admin.display(description='Submissions')
    def submission_count(self, obj):
        return obj.submissions.count()


@admin.register(EnquiryFormField)
class EnquiryFormFieldAdmin(admin.ModelAdmin):
    list_display = ['label', 'form', 'field_type', 'is_required', 'is_active', 'sort_order']
    list_filter = ['field_type', 'is_required', 'is_active']
    search_fields = ['label']
    readonly_fields = ['id', 'slug', 'created_at', 'updated_at']


class SubmissionAnswerInline(admin.TabularInline):
    model = EnquirySubmissionAnswer
    extra = 0
    readonly_fields = ['question_label_snapshot', 'question_type_snapshot', 'answer_value', 'answer_json']


@admin.register(EnquirySubmission)
class EnquirySubmissionAdmin(admin.ModelAdmin):
    list_display = ['id', 'form', 'submitted_at', 'ip_address', 'city', 'country', 'device_type', 'status']
    list_filter = ['status', 'submitted_at', 'country', 'device_type']
    search_fields = ['city', 'ip_address']
    readonly_fields = ['id', 'submitted_at']
    inlines = [SubmissionAnswerInline]


@admin.register(EnquirySubmissionAnswer)
class EnquirySubmissionAnswerAdmin(admin.ModelAdmin):
    list_display = ['id', 'submission', 'question_label_snapshot', 'answer_value', 'created_at']
    readonly_fields = ['id', 'created_at']
