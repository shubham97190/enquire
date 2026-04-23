import uuid
from django.db import models
from django.conf import settings
from django.utils.text import slugify


class FieldType(models.TextChoices):
    TEXT = 'text', 'Text'
    TEXTAREA = 'textarea', 'Textarea'
    EMAIL = 'email', 'Email'
    NUMBER = 'number', 'Number'
    PHONE = 'phone', 'Phone'
    PASSWORD = 'password', 'Password'
    DATE = 'date', 'Date'
    DATETIME = 'datetime', 'Date & Time'
    TIME = 'time', 'Time'
    SELECT = 'select', 'Select Dropdown'
    RADIO = 'radio', 'Radio Buttons'
    CHECKBOX = 'checkbox', 'Checkbox'
    MULTI_CHECKBOX = 'multi_checkbox', 'Multi Checkbox'
    FILE = 'file', 'File Upload'
    IMAGE = 'image', 'Image Upload'
    URL = 'url', 'URL'
    HIDDEN = 'hidden', 'Hidden'
    SECTION_HEADING = 'section_heading', 'Section Heading'
    DESCRIPTION_BLOCK = 'description_block', 'Description Block'
    RATING = 'rating', 'Rating'
    RANGE_SLIDER = 'range_slider', 'Range Slider'
    YES_NO = 'yes_no', 'Yes / No'
    SIGNATURE = 'signature', 'Signature'
    LOCATION = 'location', 'Location'


class EnquiryForm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, db_index=True)
    description = models.TextField(blank=True, default='')
    unicode_text = models.CharField(max_length=50, blank=True, default='')
    is_active = models.BooleanField(default=True)
    qr_code = models.ImageField(upload_to='form_builder/qrcodes/', blank=True)
    is_redirect = models.BooleanField(default=False)
    redirect_url = models.URLField(max_length=500, blank=True, default='')
    email_notifications = models.BooleanField(
        default=True,
        help_text='Send email notification to form owner on each new submission.',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_forms',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'enquiry_forms'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._generate_unique_slug()
        super().save(*args, **kwargs)

    def _generate_unique_slug(self):
        base = slugify(self.title) or 'form'
        slug = base
        counter = 2
        while EnquiryForm.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base}-{counter}"
            counter += 1
        return slug


class EnquiryFormField(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(
        EnquiryForm,
        on_delete=models.CASCADE,
        related_name='fields',
    )
    label = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, blank=True)
    field_type = models.CharField(max_length=30, choices=FieldType.choices, default=FieldType.TEXT)
    placeholder = models.CharField(max_length=255, blank=True, default='')
    help_text = models.CharField(max_length=500, blank=True, default='')
    is_required = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    default_value = models.CharField(max_length=500, blank=True, default='')
    options = models.JSONField(default=list, blank=True)
    validation_rules = models.JSONField(default=dict, blank=True)
    min_length = models.IntegerField(null=True, blank=True)
    max_length = models.IntegerField(null=True, blank=True)
    min_value = models.FloatField(null=True, blank=True)
    max_value = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'enquiry_form_fields'
        ordering = ['sort_order', 'created_at']
        unique_together = [('form', 'slug')]

    def __str__(self):
        return f"{self.label} ({self.get_field_type_display()})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.label) or 'field'
            slug = base
            counter = 2
            while EnquiryFormField.objects.filter(form=self.form, slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class SubmissionStatus(models.TextChoices):
    SUBMITTED = 'submitted', 'Submitted'
    REVIEWED = 'reviewed', 'Reviewed'
    ARCHIVED = 'archived', 'Archived'


class EnquirySubmission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(
        EnquiryForm,
        on_delete=models.CASCADE,
        related_name='submissions',
    )
    submitted_at = models.DateTimeField(auto_now_add=True)

    # Location (IP-based)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    city = models.CharField(max_length=100, blank=True, default='')
    region = models.CharField(max_length=100, blank=True, default='')
    country = models.CharField(max_length=10, blank=True, default='')
    loc = models.CharField(max_length=50, blank=True, default='')
    org = models.CharField(max_length=255, blank=True, default='')
    postal = models.CharField(max_length=20, blank=True, default='')
    timezone = models.CharField(max_length=50, blank=True, default='')

    # Device detection
    device_type = models.CharField(max_length=30, blank=True, default='')
    device_brand = models.CharField(max_length=100, blank=True, default='')
    browser_name = models.CharField(max_length=100, blank=True, default='')
    os_name = models.CharField(max_length=100, blank=True, default='')
    is_mobile = models.BooleanField(default=False)
    is_tablet = models.BooleanField(default=False)
    is_desktop = models.BooleanField(default=False)
    is_android = models.BooleanField(default=False)
    is_ios = models.BooleanField(default=False)
    is_chrome = models.BooleanField(default=False)
    is_edge = models.BooleanField(default=False)
    user_agent = models.TextField(blank=True, default='')
    raw_device_info = models.JSONField(default=dict, blank=True)
    raw_location_info = models.JSONField(default=dict, blank=True)

    status = models.CharField(
        max_length=20,
        choices=SubmissionStatus.choices,
        default=SubmissionStatus.SUBMITTED,
    )

    class Meta:
        db_table = 'enquiry_submissions'
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Submission #{str(self.id)[:8]} for {self.form.title}"


class EnquirySubmissionAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(
        EnquirySubmission,
        on_delete=models.CASCADE,
        related_name='answers',
    )
    question = models.ForeignKey(
        EnquiryFormField,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='answers',
    )
    question_label_snapshot = models.CharField(max_length=255)
    question_type_snapshot = models.CharField(max_length=30, blank=True, default='')
    answer_value = models.TextField(blank=True, default='')
    answer_json = models.JSONField(default=None, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'enquiry_submission_answers'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.question_label_snapshot}: {self.answer_value[:50]}"
