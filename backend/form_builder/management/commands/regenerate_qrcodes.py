from django.core.management.base import BaseCommand
from form_builder.models import EnquiryForm
from form_builder.utils import generate_form_qr_code


class Command(BaseCommand):
    help = 'Regenerate QR codes for all forms using the current FRONTEND_URL setting'

    def handle(self, *args, **options):
        forms = EnquiryForm.objects.all()
        total = forms.count()
        updated = 0
        for form in forms:
            try:
                generate_form_qr_code(form)
                form.save(update_fields=['qr_code'])
                updated += 1
                self.stdout.write(f'  Updated: {form.title} ({form.slug})')
            except Exception as e:
                self.stderr.write(f'  Failed: {form.title} — {e}')
        self.stdout.write(self.style.SUCCESS(f'\nDone. {updated}/{total} QR codes regenerated.'))
