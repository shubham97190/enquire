import logging
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _do_send_submission_notification(submission_id: str):
    """
    Core email-sending logic. Called by the Celery task AND directly as a
    synchronous fallback when the broker is unavailable.
    """
    from .models import EnquirySubmission

    try:
        submission = (
            EnquirySubmission.objects
            .select_related('form', 'form__created_by')
            .prefetch_related('answers')
            .get(id=submission_id)
        )
    except EnquirySubmission.DoesNotExist:
        logger.error('send_submission_notification: submission %s not found', submission_id)
        return

    form = submission.form

    # Guard: notifications disabled or no owner with email
    if not form.email_notifications:
        return
    owner = form.created_by
    if not owner or not owner.email:
        logger.warning(
            'send_submission_notification: form %s has no owner or owner has no email', form.id
        )
        return

    # Build answer list for the template (only answered questions)
    answers = [
        {
            'label': ans.question_label_snapshot,
            'value': ans.answer_value or '',
        }
        for ans in submission.answers.all()
        if ans.answer_value
    ]

    # Location string
    location_parts = [submission.city, submission.country]
    location = ', '.join(p for p in location_parts if p) or 'Unknown'

    # Admin submissions URL
    admin_url = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')
    submissions_url = f'{admin_url}/admin/surveys/{form.id}/submissions'

    owner_name = owner.get_full_name() or owner.username or owner.email.split('@')[0]
    total_submissions = form.submissions.count()

    context = {
        'owner_name': owner_name,
        'form_title': form.title,
        'submitted_at': submission.submitted_at.strftime('%d %b %Y, %I:%M %p'),
        'ip_address': submission.ip_address or '',
        'location': location,
        'device_type': submission.device_type or '',
        'browser_name': submission.browser_name or '',
        'answers': answers,
        'admin_url': submissions_url,
        'total_submissions': total_submissions,
    }

    html_message = render_to_string('emails/submission_notification_email.html', context)
    plain_message = strip_tags(html_message)

    send_mail(
        subject=f'[Enquire] New submission on "{form.title}"',
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[owner.email],
        html_message=html_message,
        fail_silently=False,
    )
    logger.info(
        'Submission notification sent to %s for form %s (submission %s)',
        owner.email, form.id, submission_id,
    )


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_submission_notification(self, submission_id: str):
    """
    Celery task wrapper — retries up to 3 times on SMTP failure.
    """
    try:
        _do_send_submission_notification(submission_id)
    except Exception as exc:
        logger.error('Failed to send submission notification: %s', exc)
        raise self.retry(exc=exc)
