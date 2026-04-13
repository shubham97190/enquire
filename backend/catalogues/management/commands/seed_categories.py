from django.core.management.base import BaseCommand
from catalogues.models import Category


SEED_CATEGORIES = [
    'WLAN Controller',
    'Switching',
    'Indoor AP',
    'Outdoor AP',
]


class Command(BaseCommand):
    help = 'Seed the database with initial categories'

    def handle(self, *args, **options):
        created_count = 0
        for name in SEED_CATEGORIES:
            _, created = Category.objects.get_or_create(name=name)
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created: {name}'))
            else:
                self.stdout.write(f'  Already exists: {name}')

        self.stdout.write(self.style.SUCCESS(
            f'\nSeeding complete. {created_count} new categories created.'
        ))
