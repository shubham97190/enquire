import logging
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_otp_email(self, enquiry_id, otp_code):
    """Send OTP verification email to user."""
    from .models import Enquiry
    try:
        enquiry = Enquiry.objects.select_related('category').get(id=enquiry_id)
        context = {
            'name': enquiry.name,
            'otp_code': otp_code,
            'expiry_minutes': settings.OTP_EXPIRY_MINUTES,
            'category': enquiry.category.name,
        }
        html_message = render_to_string('emails/otp_email.html', context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject='Your Enquiry Verification Code',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[enquiry.email],
            html_message=html_message,
        )
        logger.info(f"OTP email sent to {enquiry.email} for enquiry {enquiry.id}")
    except Enquiry.DoesNotExist:
        logger.error(f"Enquiry {enquiry_id} not found for OTP email")
    except Exception as exc:
        logger.error(f"Failed to send OTP email: {exc}")
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_otp_sms(self, enquiry_id, otp_code):
    """Send OTP verification SMS via Twilio."""
    from .models import Enquiry
    try:
        enquiry = Enquiry.objects.get(id=enquiry_id)

        if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_PHONE_NUMBER]):
            logger.warning("Twilio not configured, skipping SMS")
            return

        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=f"Your verification code is {otp_code}. Valid for {settings.OTP_EXPIRY_MINUTES} minutes.",
            from_=settings.TWILIO_PHONE_NUMBER,
            to=enquiry.phone,
        )
        logger.info(f"OTP SMS sent to {enquiry.phone}, SID: {message.sid}")
    except Enquiry.DoesNotExist:
        logger.error(f"Enquiry {enquiry_id} not found for OTP SMS")
    except Exception as exc:
        logger.error(f"Failed to send OTP SMS: {exc}")
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_download_link_email(self, enquiry_id, download_url):
    """Send download link email to user after OTP verification."""
    from .models import Enquiry
    try:
        enquiry = Enquiry.objects.select_related('category').get(id=enquiry_id)
        context = {
            'name': enquiry.name,
            'category': enquiry.category.name,
            'download_url': download_url,
            'expiry_hours': settings.DOWNLOAD_LINK_EXPIRY_HOURS,
            'max_downloads': settings.DOWNLOAD_MAX_USES,
        }
        html_message = render_to_string('emails/download_link_email.html', context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject=f'Your {enquiry.category.name} Catalogue Download Link',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[enquiry.email],
            html_message=html_message,
        )
        enquiry.download_link_sent = True
        enquiry.save(update_fields=['download_link_sent'])
        logger.info(f"Download link email sent to {enquiry.email}")
    except Enquiry.DoesNotExist:
        logger.error(f"Enquiry {enquiry_id} not found for download email")
    except Exception as exc:
        logger.error(f"Failed to send download link email: {exc}")
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_admin_notification_email(self, enquiry_id):
    """Send notification email to admin about a new verified enquiry."""
    from .models import Enquiry
    try:
        enquiry = Enquiry.objects.select_related('category').get(id=enquiry_id)
        context = {
            'name': enquiry.name,
            'email': enquiry.email,
            'phone': enquiry.phone,
            'category': enquiry.category.name,
            'description': enquiry.description,
            'verified': enquiry.otp_verified,
            'verified_at': enquiry.otp_verified_at,
            'created_at': enquiry.created_at,
        }
        html_message = render_to_string('emails/admin_notification_email.html', context)
        plain_message = strip_tags(html_message)

        # Get all admin emails
        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_emails = list(
            User.objects.filter(
                role__in=[User.Role.SUPER_ADMIN],
                is_active=True,
            ).values_list('email', flat=True)
        )
        # Fallback to ADMIN_EMAIL setting
        if not admin_emails:
            admin_emails = [settings.ADMIN_EMAIL]

        send_mail(
            subject=f'New Verified Enquiry: {enquiry.category.name} - {enquiry.name}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            html_message=html_message,
        )
        logger.info(f"Admin notification sent for enquiry {enquiry.id}")
    except Enquiry.DoesNotExist:
        logger.error(f"Enquiry {enquiry_id} not found for admin notification")
    except Exception as exc:
        logger.error(f"Failed to send admin notification: {exc}")
        self.retry(exc=exc)
