from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path('auth/login/', views.LoginView.as_view(), name='admin-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='admin-token-refresh'),
    path('auth/logout/', views.LogoutView.as_view(), name='admin-logout'),
    path('auth/me/', views.MeView.as_view(), name='admin-me'),
    path('users/', views.UserListCreateView.as_view(), name='user-list-create'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
]
