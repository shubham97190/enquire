import io
import logging
import re

import qrcode
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils.text import slugify

logger = logging.getLogger(__name__)


def generate_form_qr_code(form_instance):
    """Generate QR code PNG for the public form URL and save to the form's qr_code field."""
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    public_url = f"{frontend_url}/forms/{form_instance.slug}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(public_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)

    filename = f"form-{form_instance.slug}-qr.png"
    form_instance.qr_code.save(filename, ContentFile(buffer.getvalue()), save=False)


def get_unique_slug(title, exclude_id=None):
    """Generate a unique slug from a title, appending -2, -3, etc. if needed."""
    from .models import EnquiryForm

    base = slugify(title) or 'form'
    slug = base
    counter = 2
    qs = EnquiryForm.objects.all()
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)

    while qs.filter(slug=slug).exists():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


def get_duplicate_title(original_title):
    """
    Generate a duplicate title with '-copy' suffix.
    Handles sequential copies: 'My Form' -> 'My Form-copy' -> 'My Form-copy-2' -> 'My Form-copy-3'
    """
    from .models import EnquiryForm

    # Strip existing -copy[-N] suffix to get the base title
    match = re.match(r'^(.*?)-copy(?:-(\d+))?$', original_title)
    if match:
        base_title = match.group(1)
    else:
        base_title = original_title

    # Try 'base-copy', then 'base-copy-2', 'base-copy-3', etc.
    candidate = f"{base_title}-copy"
    if not EnquiryForm.objects.filter(title=candidate).exists():
        return candidate

    counter = 2
    while True:
        candidate = f"{base_title}-copy-{counter}"
        if not EnquiryForm.objects.filter(title=candidate).exists():
            return candidate
        counter += 1
