from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('form_builder', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='enquiryform',
            name='email_notifications',
            field=models.BooleanField(
                default=True,
                help_text='Send email notification to form owner on each new submission.',
            ),
        ),
    ]
