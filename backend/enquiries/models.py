import uuid
from django.db import models
from django.conf import settings

from catalogues.models import Category


class Enquiry(models.Model):
    class Status(models.TextChoices):
        NEW = 'NEW', 'New'
        CONTACTED = 'CONTACTED', 'Contacted'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        CLOSED = 'CLOSED', 'Closed'
        NOT_INTERESTED = 'NOT_INTERESTED', 'Not Interested'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='enquiries',
    )
    description = models.TextField(max_length=2000)

    # Verification
    otp_verified = models.BooleanField(default=False)
    otp_verified_at = models.DateTimeField(blank=True, null=True)
    otp_resend_count = models.IntegerField(default=0)

    # Download tracking
    download_link_sent = models.BooleanField(default=False)
    download_count = models.IntegerField(default=0)

    # Admin management
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
    )
    admin_notes = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'enquiries'
        verbose_name_plural = 'enquiries'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.category.name} ({self.created_at:%Y-%m-%d})"


class OTPRecord(models.Model):
    class Channel(models.TextChoices):
        EMAIL = 'EMAIL', 'Email'
        SMS = 'SMS', 'SMS'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enquiry = models.ForeignKey(
        Enquiry,
        on_delete=models.CASCADE,
        related_name='otp_records',
    )
    otp_hash = models.CharField(max_length=64)  # SHA-256 hash
    channel = models.CharField(max_length=10, choices=Channel.choices)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'otp_records'
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.enquiry.name} via {self.channel}"


class DownloadToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enquiry = models.ForeignKey(
        Enquiry,
        on_delete=models.CASCADE,
        related_name='download_tokens',
    )
    token = models.CharField(max_length=255, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    used_count = models.IntegerField(default=0)
    max_uses = models.IntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'download_tokens'
        ordering = ['-created_at']

    def __str__(self):
        return f"Download token for {self.enquiry.name}"

    @property
    def is_valid(self):
        from django.utils import timezone
        return (
            not self.is_expired
            and self.used_count < self.max_uses
        )

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at


class EnquiryAction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enquiry = models.ForeignKey(
        Enquiry,
        on_delete=models.CASCADE,
        related_name='actions',
    )
    action_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enquiry_actions',
    )
    old_status = models.CharField(max_length=20, blank=True, default='')
    new_status = models.CharField(max_length=20, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'enquiry_actions'
        ordering = ['-created_at']

    def __str__(self):
        return f"Action on {self.enquiry.name} by {self.action_by}"
