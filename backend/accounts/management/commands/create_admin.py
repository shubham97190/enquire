from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a super admin user for the admin panel'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='admin')
        parser.add_argument('--email', type=str, default='admin@yourdomain.com')
        parser.add_argument('--password', type=str, default='admin123456')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']

        if User.objects.filter(username=username).exists():
            self.stdout.write(f'User "{username}" already exists.')
            return

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role=User.Role.SUPER_ADMIN,
            first_name='Super',
            last_name='Admin',
        )
        self.stdout.write(self.style.SUCCESS(
            f'Super admin created: {user.username} ({user.email})'
        ))
