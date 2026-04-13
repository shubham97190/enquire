from django.contrib import admin
from .models import Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'has_catalogue', 'file_uploaded_at', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']
    readonly_fields = ['slug', 'created_at', 'updated_at']
