import logging
from django.conf import settings
from django.db.models import Count, Q
from django.db.models.functions import TruncDate, TruncMonth
from django.http import FileResponse
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.views import IsAdminUser
from .filters import EnquiryFilter
from .models import Enquiry, OTPRecord, DownloadToken, EnquiryAction
from .serializers import (
    EnquirySubmitSerializer,
    OTPVerifySerializer,
    EnquiryListSerializer,
    EnquiryDetailSerializer,
    EnquiryUpdateSerializer,
    EnquiryActionCreateSerializer,
)
from .tasks import (
    send_otp_email,
    send_otp_sms,
    send_download_link_email,
    send_admin_notification_email,
)
from .utils import (
    create_otp_records,
    verify_otp_hash,
    generate_download_token,
    get_download_url,
    mask_email,
    mask_phone,
)

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────
# PUBLIC ENDPOINTS
# ──────────────────────────────────────────────────────────────

class EnquirySubmitView(APIView):
    """Public: Submit an enquiry and trigger OTP send."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'anon'

    def post(self, request):
        serializer = EnquirySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enquiry = serializer.save()

        # Generate OTP and send via email + SMS
        otp_code = create_otp_records(enquiry)

        # Fire async tasks for both channels
        send_otp_email.delay(str(enquiry.id), otp_code)
        send_otp_sms.delay(str(enquiry.id), otp_code)

        return Response({
            'id': str(enquiry.id),
            'message': 'Enquiry submitted. OTP sent to your email and phone.',
            'masked_email': mask_email(enquiry.email),
            'masked_phone': mask_phone(enquiry.phone),
        }, status=status.HTTP_201_CREATED)


class OTPVerifyView(APIView):
    """Public: Verify OTP for an enquiry."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'otp'

    def post(self, request, pk):
        try:
            enquiry = Enquiry.objects.get(id=pk)
        except Enquiry.DoesNotExist:
            return Response(
                {'detail': 'Enquiry not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if enquiry.otp_verified:
            return Response(
                {'detail': 'Enquiry already verified.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        otp_code = serializer.validated_data['otp_code']

        # Get the latest active OTP record (same OTP for both channels)
        otp_record = OTPRecord.objects.filter(
            enquiry=enquiry,
            is_used=False,
            channel=OTPRecord.Channel.EMAIL,  # Both channels share the same hash
        ).order_by('-created_at').first()

        if not otp_record:
            return Response(
                {'detail': 'No active OTP found. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check expiry
        if timezone.now() > otp_record.expires_at:
            return Response(
                {'detail': 'OTP has expired. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check max attempts
        if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
            return Response(
                {'detail': 'Maximum OTP attempts exceeded. Please request a new one.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Verify OTP
        if not verify_otp_hash(otp_code, otp_record.otp_hash):
            # Increment attempts on all matching OTP records
            OTPRecord.objects.filter(
                enquiry=enquiry,
                is_used=False,
            ).update(attempts=otp_record.attempts + 1)

            remaining = settings.OTP_MAX_ATTEMPTS - otp_record.attempts - 1
            return Response(
                {
                    'detail': 'Invalid OTP.',
                    'remaining_attempts': max(remaining, 0),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # OTP is valid — mark verified
        OTPRecord.objects.filter(enquiry=enquiry, is_used=False).update(is_used=True)
        enquiry.otp_verified = True
        enquiry.otp_verified_at = timezone.now()
        enquiry.save(update_fields=['otp_verified', 'otp_verified_at', 'updated_at'])

        # Generate download token and send emails
        download_token = generate_download_token(enquiry)
        download_url = get_download_url(download_token.token)

        send_download_link_email.delay(str(enquiry.id), download_url)
        send_admin_notification_email.delay(str(enquiry.id))

        return Response({
            'detail': 'OTP verified successfully. Download link sent to your email.',
            'verified': True,
        })


class OTPResendView(APIView):
    """Public: Resend OTP for an enquiry."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'otp'

    def post(self, request, pk):
        try:
            enquiry = Enquiry.objects.get(id=pk)
        except Enquiry.DoesNotExist:
            return Response(
                {'detail': 'Enquiry not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if enquiry.otp_verified:
            return Response(
                {'detail': 'Enquiry already verified.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check resend limit
        if enquiry.otp_resend_count >= settings.OTP_MAX_RESENDS:
            return Response(
                {'detail': 'Maximum resend limit reached. Please contact support.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Check cooldown (60s between resends)
        last_otp = OTPRecord.objects.filter(enquiry=enquiry).order_by('-created_at').first()
        if last_otp:
            cooldown = timezone.now() - last_otp.created_at
            if cooldown.total_seconds() < settings.OTP_RESEND_COOLDOWN_SECONDS:
                remaining = int(settings.OTP_RESEND_COOLDOWN_SECONDS - cooldown.total_seconds())
                return Response(
                    {
                        'detail': f'Please wait {remaining} seconds before requesting a new OTP.',
                        'retry_after': remaining,
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        # Generate new OTP and send
        otp_code = create_otp_records(enquiry)
        enquiry.otp_resend_count += 1
        enquiry.save(update_fields=['otp_resend_count'])

        send_otp_email.delay(str(enquiry.id), otp_code)
        send_otp_sms.delay(str(enquiry.id), otp_code)

        return Response({
            'detail': 'OTP resent to your email and phone.',
            'resends_remaining': settings.OTP_MAX_RESENDS - enquiry.otp_resend_count,
            'masked_email': mask_email(enquiry.email),
            'masked_phone': mask_phone(enquiry.phone),
        })


class DownloadFileView(APIView):
    """Public: Download catalogue file using signed token."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            download_token = DownloadToken.objects.select_related(
                'enquiry__category'
            ).get(token=token)
        except DownloadToken.DoesNotExist:
            return Response(
                {'detail': 'Invalid download link.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if download_token.is_expired:
            return Response(
                {'detail': 'Download link has expired.'},
                status=status.HTTP_410_GONE,
            )

        if download_token.used_count >= download_token.max_uses:
            return Response(
                {'detail': 'Download limit exceeded.'},
                status=status.HTTP_410_GONE,
            )

        category = download_token.enquiry.category
        if not category.catalogue_file:
            return Response(
                {'detail': 'Catalogue file not available.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Increment counters
        download_token.used_count += 1
        download_token.save(update_fields=['used_count'])

        enquiry = download_token.enquiry
        enquiry.download_count += 1
        enquiry.save(update_fields=['download_count'])

        # Serve file
        file_path = category.catalogue_file.path
        response = FileResponse(
            open(file_path, 'rb'),
            content_type='application/pdf',
        )
        response['Content-Disposition'] = f'attachment; filename="{category.slug}-catalogue.pdf"'
        return response


# ──────────────────────────────────────────────────────────────
# ADMIN ENDPOINTS
# ──────────────────────────────────────────────────────────────

class AdminDashboardView(APIView):
    """Admin: Dashboard analytics."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        qs = Enquiry.objects.all()

        # Aggregate stats
        total = qs.count()
        verified = qs.filter(otp_verified=True).count()
        today = qs.filter(created_at__gte=today_start).count()
        this_month = qs.filter(created_at__gte=month_start).count()
        pending = qs.filter(status=Enquiry.Status.NEW).count()
        total_downloads = sum(qs.values_list('download_count', flat=True))

        # Category-wise counts
        category_stats = list(
            qs.values('category__name')
            .annotate(count=Count('id'))
            .order_by('category__name')
        )

        # Daily trend (last 30 days)
        thirty_days_ago = now - timezone.timedelta(days=30)
        daily_trend = list(
            qs.filter(created_at__gte=thirty_days_ago)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        # Convert dates to strings for JSON
        for item in daily_trend:
            item['date'] = item['date'].isoformat()

        # Monthly trend (last 12 months)
        twelve_months_ago = now - timezone.timedelta(days=365)
        monthly_trend = list(
            qs.filter(created_at__gte=twelve_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        for item in monthly_trend:
            item['month'] = item['month'].isoformat()

        # Status-wise counts
        status_stats = list(
            qs.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )

        return Response({
            'total_enquiries': total,
            'verified_enquiries': verified,
            'today_enquiries': today,
            'monthly_enquiries': this_month,
            'pending_enquiries': pending,
            'total_downloads': total_downloads,
            'category_stats': category_stats,
            'daily_trend': daily_trend,
            'monthly_trend': monthly_trend,
            'status_stats': status_stats,
        })


class AdminEnquiryListView(generics.ListAPIView):
    """Admin: List all enquiries with filters and search."""
    permission_classes = [IsAdminUser]
    serializer_class = EnquiryListSerializer
    filterset_class = EnquiryFilter
    search_fields = ['name', 'email', 'phone']
    ordering_fields = ['created_at', 'name', 'status']

    def get_queryset(self):
        return Enquiry.objects.select_related('category').all()


class AdminEnquiryDetailView(generics.RetrieveUpdateAPIView):
    """Admin: View/update a single enquiry."""
    permission_classes = [IsAdminUser]
    queryset = Enquiry.objects.select_related('category').prefetch_related('actions__action_by')
    lookup_field = 'pk'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return EnquiryUpdateSerializer
        return EnquiryDetailSerializer

    def perform_update(self, serializer):
        old_status = self.get_object().status
        instance = serializer.save()

        # Create action record if status changed
        new_status = instance.status
        if old_status != new_status:
            EnquiryAction.objects.create(
                enquiry=instance,
                action_by=self.request.user,
                old_status=old_status,
                new_status=new_status,
                notes=f"Status changed from {old_status} to {new_status}",
            )


class AdminEnquiryActionCreateView(APIView):
    """Admin: Add an action/follow-up to an enquiry."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            enquiry = Enquiry.objects.get(id=pk)
        except Enquiry.DoesNotExist:
            return Response(
                {'detail': 'Enquiry not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = EnquiryActionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = enquiry.status
        new_status = serializer.validated_data.get('new_status', '')
        notes = serializer.validated_data.get('notes', '')

        # Update enquiry status if provided
        if new_status and new_status != old_status:
            enquiry.status = new_status
            enquiry.save(update_fields=['status', 'updated_at'])

        # Create action record
        action = EnquiryAction.objects.create(
            enquiry=enquiry,
            action_by=request.user,
            old_status=old_status,
            new_status=new_status or old_status,
            notes=notes,
        )

        return Response({
            'id': str(action.id),
            'detail': 'Action recorded successfully.',
        }, status=status.HTTP_201_CREATED)
