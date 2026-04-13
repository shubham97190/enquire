from django.urls import path
from . import views

urlpatterns = [
    # Public
    path('forms/<slug:slug>/', views.PublicFormView.as_view(), name='public-form'),
    path('forms/<slug:slug>/submit/', views.PublicFormSubmitView.as_view(), name='public-form-submit'),

    # Admin: Dashboard
    path('admin/dashboard/', views.AdminFormsDashboardView.as_view(), name='admin-forms-dashboard'),

    # Admin: Forms CRUD
    path('admin/forms/', views.AdminFormListCreateView.as_view(), name='admin-form-list-create'),
    path('admin/forms/<uuid:pk>/', views.AdminFormDetailView.as_view(), name='admin-form-detail'),
    path('admin/forms/<uuid:pk>/duplicate/', views.AdminFormDuplicateView.as_view(), name='admin-form-duplicate'),

    # Admin: Fields
    path('admin/forms/<uuid:pk>/fields/', views.AdminFormFieldsBulkView.as_view(), name='admin-form-fields-bulk'),
    path('admin/forms/<uuid:pk>/fields/create/', views.AdminFormFieldCreateView.as_view(), name='admin-form-field-create'),
    path('admin/forms/<uuid:pk>/fields/<uuid:field_pk>/', views.AdminFormFieldDetailView.as_view(), name='admin-form-field-detail'),

    # Admin: Submissions
    path('admin/forms/<uuid:pk>/submissions/', views.AdminFormSubmissionsView.as_view(), name='admin-form-submissions'),
    path('admin/forms/<uuid:pk>/submissions/export/', views.AdminFormSubmissionsExportView.as_view(), name='admin-form-submissions-export'),
    path('admin/forms/<uuid:pk>/submissions/<uuid:sub_pk>/', views.AdminFormSubmissionDetailView.as_view(), name='admin-form-submission-detail'),

    # Admin: Report
    path('admin/forms/<uuid:pk>/report/', views.AdminFormReportView.as_view(), name='admin-form-report'),
]
