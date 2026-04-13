# Enquire — Enquiry Management System

A full-stack enquiry management system with Django 6.x REST backend and React 18 frontend.

## Features

- **Public Enquiry Form** — Users submit enquiries by selecting a product category and providing contact details
- **OTP Verification** — Email + SMS (Twilio) OTP verification before catalogue download link is sent
- **Catalogue Downloads** — Expiring signed download links with configurable TTL and use limits
- **Admin Panel** — Dashboard analytics, enquiry management with status tracking, catalogue uploads, user management
- **Daily Reports** — Automated midnight XLSX report emailed to super admins via Celery Beat
- **QR Code** — Downloadable QR code linking to the public enquiry form

## Tech Stack

| Layer     | Technology                                          |
|-----------|-----------------------------------------------------|
| Backend   | Django 6.x, Django REST Framework, SimpleJWT        |
| Frontend  | React 18, Vite, TypeScript, Tailwind CSS, Recharts  |
| Database  | PostgreSQL 18                                       |
| Queue     | Celery + Redis, django-celery-beat                  |
| SMS       | Twilio                                              |
| Reports   | openpyxl (XLSX)                                     |

---

## Quick Start (Docker)

### 1. Clone & configure

```bash
cd enquire
cp backend/.env.example backend/.env
# Edit backend/.env with your database, SMTP, and Twilio credentials
```

### 2. Start all services

```bash
docker compose up --build
```

This starts PostgreSQL, Redis, Django backend (port 8000), Celery worker, Celery beat, and React frontend (port 5173).

### 3. Create admin user

```bash
docker compose exec backend python manage.py create_admin
```

### 4. Access

- **Enquiry Form**: http://localhost:5173/enquiry
- **Admin Panel**: http://localhost:5173/admin/login

---

## Manual Setup (Development)

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 18
- Redis

### Backend

```bash
cd backend

# Virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Database
python manage.py migrate
python manage.py seed_categories
python manage.py create_admin

# Run server
python manage.py runserver
```

### Celery (separate terminals)

```bash
# Worker
celery -A config worker -l INFO

# Beat scheduler (for daily reports)
celery -A config beat -l INFO --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

See `backend/.env.example` for all available settings:

| Variable                  | Description                                 |
|---------------------------|---------------------------------------------|
| `SECRET_KEY`              | Django secret key                           |
| `DB_NAME` / `DB_USER` …  | PostgreSQL connection                       |
| `REDIS_URL`               | Redis connection string                     |
| `EMAIL_HOST` / `EMAIL_*`  | SMTP configuration                          |
| `TWILIO_ACCOUNT_SID` …   | Twilio SMS credentials                      |
| `OTP_LENGTH` / `OTP_EXPIRY_MINUTES` | OTP settings                    |
| `DOWNLOAD_LINK_EXPIRY_HOURS` / `DOWNLOAD_MAX_USES` | Download link limits |
| `FRONTEND_URL`            | Frontend base URL (for email links)         |

---

## Project Structure

```
enquire/
├── backend/
│   ├── config/             # Django settings, URLs, Celery, WSGI
│   ├── accounts/           # User model, JWT auth, user CRUD
│   ├── catalogues/         # Category model, PDF upload/management
│   ├── enquiries/          # Enquiry model, OTP, download tokens, admin actions
│   ├── reports/            # XLSX generation, daily report task, QR code
│   └── templates/emails/   # HTML email templates
├── frontend/
│   └── src/
│       ├── api/            # Axios client, API endpoint functions
│       ├── components/     # Layouts (Public, Admin)
│       ├── context/        # Auth context
│       ├── pages/
│       │   ├── public/     # EnquiryForm, OtpVerification, SubmissionSuccess, DownloadPage
│       │   └── admin/      # Login, Dashboard, EnquiryList, EnquiryDetail, CatalogueManagement, UserManagement
│       └── types/          # TypeScript interfaces
└── docker-compose.yml
```

---

## API Endpoints

### Public

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | `/api/categories/`                | List active categories   |
| POST   | `/api/enquiries/submit/`          | Submit new enquiry       |
| POST   | `/api/enquiries/verify-otp/`      | Verify OTP               |
| POST   | `/api/enquiries/resend-otp/`      | Resend OTP               |
| GET    | `/api/enquiries/download/<token>` | Download catalogue PDF   |

### Admin (JWT required)

| Method | Endpoint                                     | Description                |
|--------|----------------------------------------------|----------------------------|
| POST   | `/api/auth/login/`                           | Login                      |
| POST   | `/api/auth/logout/`                          | Logout (blacklist token)   |
| GET    | `/api/auth/me/`                              | Current user info          |
| GET    | `/api/enquiries/admin/dashboard/`            | Dashboard statistics       |
| GET    | `/api/enquiries/admin/`                      | List enquiries (filtered)  |
| GET    | `/api/enquiries/admin/<id>/`                 | Enquiry detail             |
| PATCH  | `/api/enquiries/admin/<id>/`                 | Update enquiry             |
| POST   | `/api/enquiries/admin/<id>/actions/`         | Add action to enquiry      |
| GET    | `/api/admin/categories/`                     | List all categories        |
| POST   | `/api/admin/categories/<id>/upload/`         | Upload catalogue PDF       |
| GET    | `/api/users/`                                | List admin users           |
| POST   | `/api/users/`                                | Create admin user          |
| PATCH  | `/api/users/<id>/`                           | Update admin user          |
| DELETE | `/api/users/<id>/`                           | Deactivate admin user      |
| GET    | `/api/reports/enquiries/export/`             | Export enquiries as XLSX   |
| GET    | `/api/reports/qr-code/`                      | Generate QR code PNG       |
