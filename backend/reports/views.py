import io
import qrcode
from django.conf import settings
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework import permissions

from accounts.views import IsAdminUser
from enquiries.models import Enquiry
from enquiries.filters import EnquiryFilter
from .utils import generate_enquiry_xlsx


class AdminEnquiryExportView(APIView):
    """Admin: Export filtered enquiries as XLSX."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Enquiry.objects.select_related('category').all()
        filterset = EnquiryFilter(request.query_params, queryset=qs)
        if filterset.is_valid():
            qs = filterset.qs

        # Search filter
        search = request.query_params.get('search', '').strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search)
            )

        xlsx_buffer = generate_enquiry_xlsx(qs)

        response = HttpResponse(
            xlsx_buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="enquiries_export.xlsx"'
        return response


class QRCodeView(APIView):
    """Admin: Generate QR code for public enquiry form."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        enquiry_form_url = f"{settings.FRONTEND_URL.rstrip('/')}/enquiry"

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(enquiry_form_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color='black', back_color='white')

        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type='image/png')
        response['Content-Disposition'] = 'attachment; filename="enquiry-qr-code.png"'
        return response
