import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='EnquiryForm',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('slug', models.SlugField(max_length=280, unique=True)),
                ('description', models.TextField(blank=True, default='')),
                ('unicode_text', models.CharField(blank=True, default='', max_length=50)),
                ('is_active', models.BooleanField(default=True)),
                ('qr_code', models.ImageField(blank=True, upload_to='form_builder/qrcodes/')),
                ('is_redirect', models.BooleanField(default=False)),
                ('redirect_url', models.URLField(blank=True, default='', max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_forms', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'enquiry_forms',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='EnquiryFormField',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('label', models.CharField(max_length=255)),
                ('slug', models.SlugField(blank=True, max_length=280)),
                ('field_type', models.CharField(choices=[('text', 'Text'), ('textarea', 'Textarea'), ('email', 'Email'), ('number', 'Number'), ('phone', 'Phone'), ('password', 'Password'), ('date', 'Date'), ('datetime', 'Date & Time'), ('time', 'Time'), ('select', 'Select Dropdown'), ('radio', 'Radio Buttons'), ('checkbox', 'Checkbox'), ('multi_checkbox', 'Multi Checkbox'), ('file', 'File Upload'), ('image', 'Image Upload'), ('url', 'URL'), ('hidden', 'Hidden'), ('section_heading', 'Section Heading'), ('description_block', 'Description Block'), ('rating', 'Rating'), ('range_slider', 'Range Slider'), ('yes_no', 'Yes / No'), ('signature', 'Signature'), ('location', 'Location')], default='text', max_length=30)),
                ('placeholder', models.CharField(blank=True, default='', max_length=255)),
                ('help_text', models.CharField(blank=True, default='', max_length=500)),
                ('is_required', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('sort_order', models.IntegerField(default=0)),
                ('default_value', models.CharField(blank=True, default='', max_length=500)),
                ('options', models.JSONField(blank=True, default=list)),
                ('validation_rules', models.JSONField(blank=True, default=dict)),
                ('min_length', models.IntegerField(blank=True, null=True)),
                ('max_length', models.IntegerField(blank=True, null=True)),
                ('min_value', models.FloatField(blank=True, null=True)),
                ('max_value', models.FloatField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('form', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fields', to='form_builder.enquiryform')),
            ],
            options={
                'db_table': 'enquiry_form_fields',
                'ordering': ['sort_order', 'created_at'],
                'unique_together': {('form', 'slug')},
            },
        ),
        migrations.CreateModel(
            name='EnquirySubmission',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('city', models.CharField(blank=True, default='', max_length=100)),
                ('region', models.CharField(blank=True, default='', max_length=100)),
                ('country', models.CharField(blank=True, default='', max_length=10)),
                ('loc', models.CharField(blank=True, default='', max_length=50)),
                ('org', models.CharField(blank=True, default='', max_length=255)),
                ('postal', models.CharField(blank=True, default='', max_length=20)),
                ('timezone', models.CharField(blank=True, default='', max_length=50)),
                ('device_type', models.CharField(blank=True, default='', max_length=30)),
                ('device_brand', models.CharField(blank=True, default='', max_length=100)),
                ('browser_name', models.CharField(blank=True, default='', max_length=100)),
                ('os_name', models.CharField(blank=True, default='', max_length=100)),
                ('is_mobile', models.BooleanField(default=False)),
                ('is_tablet', models.BooleanField(default=False)),
                ('is_desktop', models.BooleanField(default=False)),
                ('is_android', models.BooleanField(default=False)),
                ('is_ios', models.BooleanField(default=False)),
                ('is_chrome', models.BooleanField(default=False)),
                ('is_edge', models.BooleanField(default=False)),
                ('user_agent', models.TextField(blank=True, default='')),
                ('raw_device_info', models.JSONField(blank=True, default=dict)),
                ('raw_location_info', models.JSONField(blank=True, default=dict)),
                ('status', models.CharField(choices=[('submitted', 'Submitted'), ('reviewed', 'Reviewed'), ('archived', 'Archived')], default='submitted', max_length=20)),
                ('form', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='submissions', to='form_builder.enquiryform')),
            ],
            options={
                'db_table': 'enquiry_submissions',
                'ordering': ['-submitted_at'],
            },
        ),
        migrations.CreateModel(
            name='EnquirySubmissionAnswer',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('question_label_snapshot', models.CharField(max_length=255)),
                ('question_type_snapshot', models.CharField(blank=True, default='', max_length=30)),
                ('answer_value', models.TextField(blank=True, default='')),
                ('answer_json', models.JSONField(blank=True, default=None, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('question', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='answers', to='form_builder.enquiryformfield')),
                ('submission', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answers', to='form_builder.enquirysubmission')),
            ],
            options={
                'db_table': 'enquiry_submission_answers',
                'ordering': ['created_at'],
            },
        ),
    ]
