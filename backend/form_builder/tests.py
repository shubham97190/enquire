import io

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from .models import EnquiryForm, EnquirySubmission, SubmissionStatus

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


class PublicFormSubmitRedirectDelayTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner2', password='pass12345', role=User.Role.STAFF,
        )

    def test_submit_response_includes_redirect_delay_when_redirecting(self):
        form = EnquiryForm.objects.create(
            title='Redirect Form',
            created_by=self.owner,
            is_redirect=True,
            redirect_url='https://example.com/thanks',
            redirect_delay_seconds=8,
            email_notifications=False,
        )
        response = self.client.post(
            f'/api/forms/{form.slug}/submit/',
            {'answers': {'dummy': 'x'}},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['redirect_delay_seconds'], 8)

    def test_submit_response_delay_is_zero_when_not_redirecting(self):
        form = EnquiryForm.objects.create(
            title='No Redirect Form',
            created_by=self.owner,
            is_redirect=False,
            redirect_delay_seconds=8,
            email_notifications=False,
        )
        response = self.client.post(
            f'/api/forms/{form.slug}/submit/',
            {'answers': {'dummy': 'x'}},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['redirect_delay_seconds'], 0)


class AdminSubmissionsFilterTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner3', password='pass12345', role=User.Role.STAFF,
        )
        self.form = EnquiryForm.objects.create(title='Filter Form', created_by=self.owner)
        self.sub_reviewed = EnquirySubmission.objects.create(
            form=self.form, city='Mumbai', status=SubmissionStatus.REVIEWED,
        )
        self.sub_submitted = EnquirySubmission.objects.create(
            form=self.form, city='Delhi', status=SubmissionStatus.SUBMITTED,
        )
        self.url = f'/api/admin/forms/{self.form.id}/submissions/'
        self.client.force_authenticate(self.owner)

    def test_filter_by_status(self):
        response = self.client.get(self.url, {'status': 'reviewed'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in response.data['results']]
        self.assertEqual(ids, [str(self.sub_reviewed.id)])

    def test_search_by_city(self):
        response = self.client.get(self.url, {'search': 'Delhi'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r['id'] for r in response.data['results']]
        self.assertEqual(ids, [str(self.sub_submitted.id)])


class AdminSubmissionsBulkActionTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner4', password='pass12345', role=User.Role.STAFF,
        )
        self.other_staff = User.objects.create_user(
            username='other4', password='pass12345', role=User.Role.STAFF,
        )
        self.form = EnquiryForm.objects.create(title='Bulk Form', created_by=self.owner)
        self.sub1 = EnquirySubmission.objects.create(form=self.form, status=SubmissionStatus.SUBMITTED)
        self.sub2 = EnquirySubmission.objects.create(form=self.form, status=SubmissionStatus.SUBMITTED)
        self.url = f'/api/admin/forms/{self.form.id}/submissions/bulk/'

    def test_owner_can_bulk_set_status(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {
            'ids': [str(self.sub1.id), str(self.sub2.id)],
            'action': 'set_status',
            'status': 'reviewed',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['affected'], 2)
        self.sub1.refresh_from_db()
        self.assertEqual(self.sub1.status, SubmissionStatus.REVIEWED)

    def test_owner_can_bulk_delete(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {
            'ids': [str(self.sub1.id)],
            'action': 'delete',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['affected'], 1)
        self.assertFalse(EnquirySubmission.objects.filter(id=self.sub1.id).exists())

    def test_non_owner_staff_cannot_bulk_act(self):
        self.client.force_authenticate(self.other_staff)
        response = self.client.post(self.url, {
            'ids': [str(self.sub1.id)],
            'action': 'delete',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_action_returns_400(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, {
            'ids': [str(self.sub1.id)],
            'action': 'nonsense',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
