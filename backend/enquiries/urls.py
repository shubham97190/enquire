from django.urls import path

from . import views

urlpatterns = [
    # Public
    path('enquiries/', views.EnquirySubmitView.as_view(), name='enquiry-submit'),
    path('enquiries/<uuid:pk>/verify-otp/', views.OTPVerifyView.as_view(), name='otp-verify'),
    path('enquiries/<uuid:pk>/resend-otp/', views.OTPResendView.as_view(), name='otp-resend'),
    path('download/<str:token>/', views.DownloadFileView.as_view(), name='download-file'),

    # Admin
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/enquiries/', views.AdminEnquiryListView.as_view(), name='admin-enquiry-list'),
    path('admin/enquiries/<uuid:pk>/', views.AdminEnquiryDetailView.as_view(), name='admin-enquiry-detail'),
    path('admin/enquiries/<uuid:pk>/actions/', views.AdminEnquiryActionCreateView.as_view(), name='admin-enquiry-action'),
]
