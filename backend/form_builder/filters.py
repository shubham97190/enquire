import django_filters

from .models import EnquirySubmission, SubmissionStatus


class SubmissionFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=SubmissionStatus.choices)
    submitted_after = django_filters.DateFilter(field_name='submitted_at', lookup_expr='date__gte')
    submitted_before = django_filters.DateFilter(field_name='submitted_at', lookup_expr='date__lte')

    class Meta:
        model = EnquirySubmission
        fields = ['status', 'submitted_after', 'submitted_before']
