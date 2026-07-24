import io

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from .models import EnquiryForm

User = get_user_model()


def make_image_file(name='logo.png'):
    buf = io.BytesIO()
    Image.new('RGB', (10, 10), color='red').save(buf, format='PNG')
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type='image/png')


class FormLogoUploadTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', password='pass12345', role=User.Role.STAFF,
        )
        self.other_staff = User.objects.create_user(
            username='other', password='pass12345', role=User.Role.STAFF,
        )
        self.form = EnquiryForm.objects.create(title='Test Form', created_by=self.owner)
        self.url = f'/api/admin/forms/{self.form.id}/logo/'

    def test_owner_can_upload_logo(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {'logo': make_image_file()}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data['logo_url'])
        self.form.refresh_from_db()
        self.assertTrue(bool(self.form.logo))

    def test_non_owner_staff_cannot_upload_logo(self):
        self.client.force_authenticate(self.other_staff)
        response = self.client.post(self.url, {'logo': make_image_file()}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_upload_without_file_returns_400(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_owner_can_remove_logo(self):
        self.client.force_authenticate(self.owner)
        self.client.post(self.url, {'logo': make_image_file()}, format='multipart')
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['logo_url'])
