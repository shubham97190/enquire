from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from accounts.views import IsAdminUser, IsSuperAdmin
from .models import Category
from .serializers import (
    CategoryListSerializer,
    CategoryDetailSerializer,
    CategoryCreateUpdateSerializer,
    CategoryUploadSerializer,
)


class PublicCategoryListView(generics.ListAPIView):
    """Public: active categories for the enquiry form dropdown."""
    permission_classes = [permissions.AllowAny]
    serializer_class = CategoryListSerializer
    queryset = Category.objects.filter(is_active=True)
    pagination_class = None


class AdminCategoryListCreateView(generics.ListCreateAPIView):
    """Admin: list all categories + create a new one."""
    permission_classes = [IsAdminUser]
    queryset = Category.objects.all().order_by('name')
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CategoryCreateUpdateSerializer
        return CategoryDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = CategoryCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        # return full detail after creation
        return Response(
            CategoryDetailSerializer(instance).data,
            status=status.HTTP_201_CREATED,
        )


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin: retrieve, rename/toggle, or delete a category."""
    permission_classes = [IsSuperAdmin]
    queryset = Category.objects.all()
    lookup_field = 'pk'

    def get_serializer_class(self):
        return CategoryCreateUpdateSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response(CategoryDetailSerializer(instance).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = CategoryCreateUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(CategoryDetailSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # delete catalogue file from storage if exists
        if instance.catalogue_file:
            try:
                instance.catalogue_file.delete(save=False)
            except Exception:
                pass
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCategoryUploadView(generics.UpdateAPIView):
    """Admin: upload/replace a catalogue PDF for a category."""
    permission_classes = [IsAdminUser]
    serializer_class = CategoryUploadSerializer
    queryset = Category.objects.all()
    parser_classes = [MultiPartParser, FormParser]
    lookup_field = 'pk'

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(CategoryDetailSerializer(instance).data)
