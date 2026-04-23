from .base import *  # noqa: F401,F403

DEBUG = True

# Use console email backend for dev
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Run Celery tasks synchronously in-process — no Redis needed in dev
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
