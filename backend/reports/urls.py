from django.urls import path

from . import views

urlpatterns = [
    path('enquiries/export/', views.AdminEnquiryExportView.as_view(), name='admin-enquiry-export'),
    path('qr-code/', views.QRCodeView.as_view(), name='admin-qr-code'),
]
