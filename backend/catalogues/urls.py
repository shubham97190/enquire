from django.urls import path

from . import views

urlpatterns = [
    # Public
    path('categories/', views.PublicCategoryListView.as_view(), name='public-category-list'),

    # Admin — list + create
    path('admin/categories/', views.AdminCategoryListCreateView.as_view(), name='admin-category-list-create'),
    # Admin — retrieve + edit name/active + delete
    path('admin/categories/<uuid:pk>/', views.AdminCategoryDetailView.as_view(), name='admin-category-detail'),
    # Admin — upload PDF
    path('admin/categories/<uuid:pk>/upload/', views.AdminCategoryUploadView.as_view(), name='admin-category-upload'),
]
