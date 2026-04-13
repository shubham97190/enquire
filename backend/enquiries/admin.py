from django.contrib import admin
from .models import Enquiry, OTPRecord, DownloadToken, EnquiryAction


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'phone', 'category', 'status', 'otp_verified', 'created_at']
    list_filter = ['status', 'otp_verified', 'category', 'created_at']
    search_fields = ['name', 'email', 'phone']
    readonly_fields = ['id', 'created_at', 'updated_at', 'otp_verified_at']


@admin.register(OTPRecord)
class OTPRecordAdmin(admin.ModelAdmin):
    list_display = ['enquiry', 'channel', 'is_used', 'attempts', 'expires_at', 'created_at']
    list_filter = ['channel', 'is_used']
    readonly_fields = ['id', 'otp_hash']


@admin.register(DownloadToken)
class DownloadTokenAdmin(admin.ModelAdmin):
    list_display = ['enquiry', 'used_count', 'max_uses', 'expires_at', 'created_at']
    readonly_fields = ['id', 'token']


@admin.register(EnquiryAction)
class EnquiryActionAdmin(admin.ModelAdmin):
    list_display = ['enquiry', 'action_by', 'old_status', 'new_status', 'created_at']
    list_filter = ['new_status']
    readonly_fields = ['id', 'created_at']
