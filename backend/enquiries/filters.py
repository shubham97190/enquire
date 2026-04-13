import django_filters
from .models import Enquiry


class EnquiryFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = django_filters.DateFilter(field_name='created_at', lookup_expr='date__lte')
    category = django_filters.UUIDFilter(field_name='category_id')
    status = django_filters.CharFilter(field_name='status')
    otp_verified = django_filters.BooleanFilter(field_name='otp_verified')

    class Meta:
        model = Enquiry
        fields = ['category', 'status', 'otp_verified', 'date_from', 'date_to']
