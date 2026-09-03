# Healthcare Management System

A unified Laravel 13 application with React 19, Inertia.js, MySQL, Tailwind CSS, Sanctum, Spatie roles, and SSLCommerz-ready payments.

## Architecture

- Laravel owns page routing, sessions, validation, authorization, domain services, Eloquent models, and `/api/v1`.
- Inertia renders React pages from `resources/js/Pages` through the single `resources/views/app.blade.php` root view.
- Role dashboards are protected by `auth` plus `role:patient`, `role:doctor`, or `role:admin|super-admin`.
- Browser authentication uses Laravel's session cookie and CSRF protection. Sanctum bearer tokens remain available for external API clients.
- Appointment creation and rescheduling reserve slots inside database transactions with row locks.
- SSLCommerz is isolated behind `PaymentService` and `SSLCommerzService`.

## Setup

```bash
composer install
npm install
php artisan key:generate
php artisan migrate
php artisan storage:link
php artisan optimize:clear
npm run dev
```

For an optimized build:

```bash
npm run build
php artisan optimize
```

Run verification:

```bash
php artisan test
vendor/bin/pint --test
```

## WAMP

Point the Apache virtual host document root at this project's `public` directory, not the repository root. Set `APP_URL` to the chosen single domain, for example `http://healthcare.localhost`, and set `FRONTEND_URL=${APP_URL}`.

## Main paths

- Public: `/`, `/about`, `/contact`, `/doctors`, `/departments`, `/services`
- Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`
- Patient: `/patient/dashboard`, `/patient/profile`, `/appointment/book`, `/payment`
- Doctor: `/doctor/dashboard`
- Admin: `/admin/dashboard`
- API: `/api/v1/*`

Public images are served from `public/images`. User-generated storage is exposed through `public/storage`.
