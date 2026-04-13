import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from .utils import generate_enquiry_xlsx

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_daily_report(self):
    """Send daily midnight XLSX report of all enquiries from the previous day."""
    from enquiries.models import Enquiry
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        now = timezone.now()
        # Report covers the previous day (00:00:00 to 23:59:59)
        yesterday_start = (now - timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0,
        )
        yesterday_end = yesterday_start.replace(
            hour=23, minute=59, second=59, microsecond=999999,
        )

        enquiries = (
            Enquiry.objects
            .filter(created_at__range=(yesterday_start, yesterday_end))
            .select_related('category')
            .order_by('created_at')
        )

        date_str = yesterday_start.strftime('%Y-%m-%d')
        enquiry_count = enquiries.count()

        # Generate XLSX (even if empty — will have headers only)
        xlsx_buffer = generate_enquiry_xlsx(enquiries)

        # Get admin emails
        admin_emails = list(
            User.objects.filter(
                role__in=[User.Role.SUPER_ADMIN],
                is_active=True,
            ).values_list('email', flat=True)
        )
        if not admin_emails:
            admin_emails = [settings.ADMIN_EMAIL]

        # Build email
        context = {
            'date': date_str,
            'count': enquiry_count,
        }
        html_message = render_to_string('emails/daily_report_email.html', context)
        plain_message = strip_tags(html_message)

        subject = f'Daily Enquiry Report - {date_str} ({enquiry_count} enquiries)'

        email = EmailMessage(
            subject=subject,
            body=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=admin_emails,
        )
        email.content_subtype = 'html'
        email.body = html_message
        email.attach(
            f'enquiry_report_{date_str}.xlsx',
            xlsx_buffer.getvalue(),
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        email.send()

        logger.info(f"Daily report sent for {date_str}: {enquiry_count} enquiries")
    except Exception as exc:
        logger.error(f"Failed to send daily report: {exc}")
        self.retry(exc=exc)
