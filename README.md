# TASK — Task & Project Management SaaS

Multi-tenant task and project management for small businesses: a **Super Admin** runs the
platform, and each **Company** runs its own workspace.

| Path | What it is |
|---|---|
| `backend/` | Laravel 13 JSON API — Breeze API stack + Sanctum SPA cookie auth, MySQL |
| `frontend/` | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| `design/` | Design system and page designs (read-only reference) |
| `PRD.md` | What to build |
| `CLAUDE.md` | How to build it — conventions and the database safety rules |

## Getting started

### Prerequisites

- **PHP 8.3+** with `pdo_mysql`, `bcmath`, `intl` — and `pdo_sqlite` + `sqlite3` for the test suite
  (on XAMPP: uncomment `extension=pdo_sqlite` and `extension=sqlite3` in `php.ini`)
- **Composer 2**
- **Node.js 20.9+** and npm
- **MySQL 8** with an empty database named `task`

### Backend — http://localhost:8000

```bash
cd backend
composer install
cp .env.example .env              # MySQL `task` on 127.0.0.1:3306, user root, empty password
php artisan key:generate
php artisan migrate               # additive only — never migrate:fresh (CLAUDE.md §11)
php artisan db:seed --class=AdminUserSeeder
php artisan serve                 # http://localhost:8000
```

Set `APP_DEMO_MODE=true` in `.env` for local development.

### Frontend — http://localhost:3000

```bash
cd frontend
npm install
cp .env.example .env.local        # set NEXT_PUBLIC_DEMO_MODE=true for the Quick Access buttons
npm run dev                       # http://localhost:3000
```

Open the app as **http://localhost:3000**, not `127.0.0.1`: the session cookie is shared only
when both apps run on `localhost`.

### Seeded accounts

Created by `AdminUserSeeder` (idempotent; refuses to run in production).

| Role | Log in at | Email | Password |
|---|---|---|---|
| Super Admin | `/admin/login` | `superadmin@example.com` | `password` |
| Company | `/login` | `company@example.com` | `password` |

Each login page accepts only its own role. New companies can sign up at `/register`.

### Running the checks

```bash
# backend
./vendor/bin/pest                 # isolated sqlite :memory: database — never touches MySQL
./vendor/bin/pint --test

# frontend
npm run lint
npm run typecheck
npm run build
```
