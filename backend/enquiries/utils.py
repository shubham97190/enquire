import hashlib
import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.core import signing
from django.utils import timezone

from .models import OTPRecord, DownloadToken


def generate_otp():
    """Generate a 6-digit numeric OTP."""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def hash_otp(otp_code: str) -> str:
    """Hash OTP using SHA-256. Never store plaintext."""
    return hashlib.sha256(otp_code.encode('utf-8')).hexdigest()


def verify_otp_hash(otp_code: str, otp_hash: str) -> bool:
    """Verify OTP against stored hash."""
    return hash_otp(otp_code) == otp_hash


def create_otp_records(enquiry):
    """Create OTP records for both email and SMS channels. Returns plaintext OTP."""
    otp_code = generate_otp()
    otp_hashed = hash_otp(otp_code)
    expires_at = timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    # Invalidate any existing unused OTPs for this enquiry
    OTPRecord.objects.filter(
        enquiry=enquiry,
        is_used=False,
    ).update(is_used=True)

    # Create records for both channels
    for channel in [OTPRecord.Channel.EMAIL, OTPRecord.Channel.SMS]:
        OTPRecord.objects.create(
            enquiry=enquiry,
            otp_hash=otp_hashed,
            channel=channel,
            expires_at=expires_at,
        )

    return otp_code


def generate_download_token(enquiry):
    """Generate a signed, expiring download token."""
    nonce = uuid.uuid4().hex
    token_data = f"{enquiry.id}:{enquiry.category_id}:{nonce}"
    signed_token = signing.TimestampSigner().sign(token_data)

    expires_at = timezone.now() + timedelta(hours=settings.DOWNLOAD_LINK_EXPIRY_HOURS)

    download_token = DownloadToken.objects.create(
        enquiry=enquiry,
        token=signed_token,
        expires_at=expires_at,
        max_uses=settings.DOWNLOAD_MAX_USES,
    )
    return download_token


def get_download_url(token: str) -> str:
    """Build the full download URL for the frontend."""
    frontend_url = settings.FRONTEND_URL.rstrip('/')
    return f"{frontend_url}/download/{token}"


def mask_email(email: str) -> str:
    """Mask email for display: sh***@gmail.com"""
    if not email or '@' not in email:
        return email
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        masked = local[0] + '***'
    else:
        masked = local[:2] + '***'
    return f"{masked}@{domain}"


def mask_phone(phone: str) -> str:
    """Mask phone for display: ******7890"""
    if not phone or len(phone) < 4:
        return phone
    return '*' * (len(phone) - 4) + phone[-4:]
