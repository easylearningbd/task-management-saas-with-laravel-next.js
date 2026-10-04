# CLAUDE.md — Task SaaS

This file gives the coding agent (Claude Code / Codex) the context and rules for working in this repository.

**Before any feature, read in this order:**
1. `PRD.md` — what to build (source of truth for product behaviour).
2. This file — how to build it (source of truth for conventions).
3. `design/design-system/` — how it must look (source of truth for UI). See §3.

---

## 1. Project Summary

**TASK** is a multi-tenant, subscription-based task & project management SaaS (modeled on WorkDo's Task SaaS).

- **Super Admin** runs the platform: companies, subscription plans, plan requests/orders, coupons, currency, referral, landing page, email templates, settings.
- **Company (user)** runs its workspace: dashboard, calendar, projects (milestones, items, notes, expenses, contracts, files), tasks (Kanban), time tracker, timesheets, clients, invoices, expenses, contracts, items, Zoom meetings, task stages, expense categories, plans, referral, notification templates, media library, settings.
- **Two separate login pages**, one per role (see §6).

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Backend | Laravel 13, PHP 8.3+ (already installed in `backend/`) |
| Auth | Laravel Breeze **API stack** + Laravel Sanctum (SPA cookie auth) |
| Database | MySQL 8 |
| Frontend | Next.js 16 (App Router), React 19, TypeScript (strict) — already created in `frontend/` |
| Styling / UI | Tailwind CSS v4 + the project design system (§3) |
| Icons | lucide-react |
| Data fetching | TanStack Query + axios (`withCredentials: true`) |
| Forms | react-hook-form + zod |
| Charts | Recharts |
| Drag & drop | dnd-kit (Kanban, stage reordering) |
| Theme / i18n | next-themes (dark mode), next-intl (translations) |
| Backend tests | Pest |
| Queue / schedule | Laravel queue (database driver) + scheduler |

> **Breeze + Laravel 13:** Breeze is no longer listed in the current Laravel starter-kit docs. If `composer require laravel/breeze --dev` or `php artisan breeze:install api` fails, **stop and tell me**. Do not downgrade Laravel. Agreed fallback: hand-write the same auth endpoints (login, register, logout, forgot/reset password) on top of Sanctum, keeping identical behaviour.

> **Next.js 16:** request interception lives in `src/proxy.ts`, not `middleware.ts`. Verify against the installed version (`frontend/package.json` + `node_modules/next/package.json`) before using any Next.js API you are unsure about. Never assume an API from memory.

> **Never add a package** that is not in this table without asking first and saying why.

---

## 3. Design System (READ BEFORE BUILDING ANY UI)

The repository contains a ready-made design system and page designs:

```
design/
├── design-system/      # tokens, components, patterns — THE source of truth for UI
├── user-dashboard/     # company-side page designs
└── admin-dashboard/    # super-admin page designs
```

**Rules — no exceptions:**

1. **Before writing a single line of UI**, list `design/design-system/` and read its entry file (`README.md`, `index.html`, or equivalent). Extract: color tokens (light + dark), typography scale, spacing, radii, shadows, and every component spec (button, input, select, checkbox, badge, card, modal, table, sidebar, topbar, toast, empty state).
2. **Translate tokens once**, into `frontend/src/app/globals.css` (CSS variables) + the Tailwind theme, and build the shared components from them in `frontend/src/components/ui/`. Then reuse those components everywhere.
3. **Never invent a color, font size, spacing value, radius or shadow.** If a value is not in the design system, stop and ask. Don't hardcode hex colors in components — use the tokens.
4. **Before building a page**, open the matching design file in `design/user-dashboard/` or `design/admin-dashboard/` and match its layout, labels, spacing and states exactly. Report any gap between the design and the PRD instead of guessing.
5. Every screen must work in **light and dark mode** and down to **360 px width**.
6. If a needed component does not exist in the design system, propose it in the design system's own style, get my OK, add it to `components/ui/`, and only then use it.

---

## 4. Repository Layout

```
/
├── CLAUDE.md
├── PRD.md
├── design/                   # design system + page designs (read-only reference)
├── backend/                  # Laravel 13 API (already installed)
│   ├── app/
│   │   ├── Enums/            # UserType, Priority, ProjectStatus, InvoiceStatus, ...
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/Auth/      # login, register, logout, password
│   │   │   ├── Controllers/Api/V1/Admin/     # super admin controllers
│   │   │   ├── Controllers/Api/V1/Company/   # tenant controllers
│   │   │   ├── Controllers/Api/V1/Public/    # landing, public invoice, plans
│   │   │   ├── Middleware/   # EnsureRole, EnsurePlanActive
│   │   │   ├── Requests/     # Form Requests (one per store/update)
│   │   │   └── Resources/    # API Resources
│   │   ├── Models/Concerns/BelongsToCompany.php
│   │   ├── Policies/, Services/, Jobs/, Mail/, Notifications/
│   ├── database/migrations/, seeders/, factories/
│   ├── routes/api.php, routes/auth.php
│   └── tests/Feature/, tests/Unit/
└── frontend/                 # Next.js 16 (already created)
    └── src/
        ├── app/
        │   ├── (auth)/           # /login, /register, /forgot-password, /reset-password
        │   ├── (admin-auth)/     # /admin/login
        │   ├── (company)/        # /dashboard, /projects, /tasks, ...
        │   ├── (admin)/admin/    # /admin/dashboard, /admin/companies, ...
        │   └── (public)/         # landing page, /i/[token] public invoice
        ├── components/ui/        # design-system primitives (built from design/design-system)
        ├── components/layout/    # AppShell, Sidebar, Topbar, Breadcrumbs
        ├── components/shared/    # DataTable, FilterBar, StatCard, StatusBadge, FormModal, ...
        ├── features/<module>/    # api.ts, schema.ts, types.ts, components/
        ├── lib/                  # axios client, auth, utils, formatters
        ├── messages/             # i18n JSON (en.json, ...)
        └── proxy.ts              # role-based route protection
```

---

## 5. Commands

### Backend (`cd backend`)
```bash
composer install
php artisan serve                 # http://localhost:8000
php artisan migrate               # additive only — see §11
php artisan make:migration ...    # always a NEW migration for schema changes
php artisan db:seed --class=XSeeder
php artisan queue:work
php artisan schedule:work
./vendor/bin/pest                 # tests (isolated test DB only — see §11)
./vendor/bin/pint                 # code style
```

### Frontend (`cd frontend`)
```bash
npm install
npm run dev                       # http://localhost:3000
npm run lint
npm run typecheck                 # tsc --noEmit
npm run build
```

### Environment
- Backend `.env`: `APP_URL=http://localhost:8000`, `FRONTEND_URL=http://localhost:3000`, `SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000`, `SESSION_DOMAIN=localhost`, `SESSION_DRIVER=database`, `DB_CONNECTION=mysql`, `APP_DEMO_MODE=true|false`.
- `config/cors.php`: `paths` must include `api/*` (login, register and logout live under `/api/v1/auth/*`), `sanctum/csrf-cookie`, and Breeze's `forgot-password`, `reset-password`, `verify-email/*`, `email/verification-notification`; `supports_credentials => true`; `allowed_origins => [env('FRONTEND_URL')]`.
- Frontend `.env.local`: `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`, `NEXT_PUBLIC_DEMO_MODE=true|false`.
- Use `localhost` consistently on both sides (never mix `localhost` and `127.0.0.1`) or the session cookie will not be sent.
- Never commit `.env` files or secrets. Never print secrets in logs or responses.

---

## 6. Auth & Roles

`users.type` enum: `super_admin` | `company`.

| | Company (user) | Super Admin |
|---|---|---|
| Login page | `/login` | `/admin/login` |
| Register page | `/register` | **none** — seeded only |
| After login | `/dashboard` | `/admin/dashboard` |
| Login endpoint | `POST /api/v1/auth/login` | `POST /api/v1/admin/auth/login` |

- Each login endpoint accepts **only its own role**. A super admin posting to the company endpoint (or the reverse) is rejected with 403 and a clear message — never logged in and redirected.
- Registration creates a `company` user only. The endpoint can never set `type`, `plan_id`, or any admin field from request input.
- Flow: `GET /sanctum/csrf-cookie` → login → `GET /api/v1/me` (returns `UserResource`: id, name, email, role, avatar, status; plan, limits and usage are added by the plans milestone).
- Login responses: wrong password → 422 with `errors.email`; wrong role or disabled account → 403 `{ message }` with no session created; already signed in → 409; rate-limited → 429. The `guest` alias is overridden (`EnsureGuest`) to answer JSON instead of redirecting.
- Breeze's generic `/login`, `/register` and `/logout` web routes are removed on purpose — a role-agnostic login would bypass the one-role-per-endpoint rule. Breeze's forgot/reset-password and email-verification endpoints remain in `routes/auth.php`.
- Logout: `POST /api/v1/auth/logout` — invalidates the session, regenerates the CSRF token, clears client auth state, redirects to the role's login page.
- Backend route groups:
  - `/api/v1/admin/*` → `auth:sanctum`, `role:super_admin`
  - `/api/v1/*` (company) → `auth:sanctum`, `role:company` (+ `plan.active` once plans exist)
  - `/api/v1/auth/*`, `/api/v1/public/*` → guest / public
- Frontend `proxy.ts` + server-side layout guards block cross-role access: a company user hitting `/admin/*` is redirected to `/dashboard`, a super admin hitting company routes is redirected to `/admin/dashboard`, and unauthenticated users go to the matching login page. **The backend is the real guard; the frontend is only UX.**
  - Both `src/proxy.ts` and the layout guards (`requireRole()` in `features/auth/server.ts`) learn the role from `GET /api/v1/me`, forwarding the browser's cookies — the Laravel session cookie is encrypted, so there is nothing to read from it directly. If the API is unreachable the proxy passes the request through and the layout guard fails closed (error page, nothing protected rendered).
- Disabled companies (`is_login_enabled = false`) are rejected at login: "Your account is disabled. Contact the administrator."
- Login is rate-limited (5 attempts/min per email+IP).
- Quick Access demo login buttons render only when demo mode is on.
- Impersonation (admin "Login as company") must be logged and show a "Back to Admin" banner.

---

## 7. Multi-Tenancy Rules (critical)

- Every tenant-owned model uses the `BelongsToCompany` trait: a global scope `where company_id = current company`, and `company_id` set automatically on create.
- **Never** accept `company_id` from request input.
- **Never** use `withoutGlobalScopes()` in company controllers. Cross-tenant reads happen only in admin controllers, explicitly.
- Route-model binding must resolve only the current company's records (404 for others' IDs).
- Every new tenant endpoint gets a Pest test proving Company A cannot read/update/delete Company B's record.
- On company creation, `CompanySetupService` seeds default task stages, expense categories and settings, and assigns the default plan.

---

## 8. Backend Conventions

- Thin controllers → Form Request (validation) → Service (logic) → API Resource (output). Policies for authorization.
- PHP backed Enums for all statuses/priorities/types; cast them on models.
- Money: `DECIMAL(15,2)` columns, cast `decimal:2`; math in integer cents or `bcmath`, never floats.
- Dates: store UTC; format with the company's timezone in resources.
- Eager-load relations; no N+1. Paginate every list (`per_page` default 10, max 100).
- List endpoints accept `search`, module filters, `sort`, `direction`, `page`, `per_page`.
- Error format: `{ "message": "...", "errors": { "field": ["..."] } }` with correct status codes (401, 403, 404, 422, 429).
- Soft deletes on users, clients, projects, tasks, invoices, contracts.
- Business rules live in services and are unit-tested:
  - Project create → check plan `max_projects` (`-1` = unlimited).
  - Upload → check plan storage limit. AI endpoints → require plan `ai_integration`.
  - Invoice number `INV-{YYYY}-{NNNN}` per company, generated in a transaction with a lock.
  - Invoice status draft → sent → partial/paid, recalculated after every payment add/delete; payment ≤ balance due; only draft/sent invoices are editable/deletable.
  - Task moved to a done stage → progress 100, `completed_at` set.
  - One running time session per user; stopping creates a timesheet row.
  - Yearly plan price defaults to `monthly × 12 × 0.8` when empty.
  - One default plan; it cannot be deleted or deactivated.
  - Coupon validation: active, not expired, total + per-company limits, min/max spend.

---

## 9. Frontend Conventions

- TypeScript strict; no `any`. API types live in `features/<module>/types.ts` and mirror the API Resources.
- All server calls go through `src/lib/api.ts` (axios, `withCredentials: true`, CSRF handled once) and TanStack Query hooks in `features/<module>/api.ts`. No scattered `fetch` calls.
- Forms: react-hook-form + zod mirroring backend validation; show 422 errors under the matching field.
- Build UI from the design system (§3) and the shared components; every list page follows PRD §4.2.
- Every user-facing string goes through next-intl (`messages/en.json`). No hardcoded UI text.
- Server Components by default; `"use client"` only for interactive parts.
- Match the design files' layout and labels exactly unless the PRD says otherwise.

---

## 10. Workflow Rules for the Agent

1. **Plan first.** Read the relevant PRD section and design files, then propose a short plan (migrations, endpoints, pages, tests) before writing code. Wait for my OK on anything touching the schema or the auth/tenancy layer.
2. **One module at a time**, in PRD §14 order. Backend first (migration → model → policy → requests → service → controller → resource → routes → tests), then frontend.
3. **Verify, don't assume.** Before using a package API, check the installed version in `composer.lock` / `package.json`. If a command fails, report the exact error and your proposed fix — do not improvise a workaround or switch tools silently.
4. **Small, reviewable changes.** No unrelated refactors. Don't rename existing files, routes or columns without asking.
5. **Don't guess about unseen pages.** PRD items marked "proposed design" follow the PRD text; anything still unclear → ask.
6. **Git:** never force-push, never rewrite history, never commit to `main` unless I say so. Conventional commits (`feat(auth): admin login endpoint`).
7. **Definition of Done** for any module:
   - Migrations additive and running cleanly with `php artisan migrate`.
   - Pest tests pass, including role-access and tenant-isolation tests.
   - `pint`, `npm run lint`, `npm run typecheck`, `npm run build` all pass.
   - UI matches the design system and design file, in light + dark mode and at mobile width; strings translatable.
   - Summary of what changed and what is still open.

---

## 11. Database Safety Rules (NON-NEGOTIABLE)

Never run any of these, and never put them in a script, task, or CI step:

- `php artisan migrate:fresh`
- `php artisan migrate:refresh`
- `php artisan migrate:reset`
- `php artisan db:wipe`
- `php artisan migrate --seed` (or any `db:seed` that truncates tables)
- Any raw SQL containing `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`,
  or `DELETE FROM <table>` without a specific `WHERE` clause.

If a task seems to require any of the above, STOP and ask me first.
Do not "just reset the DB to make it work."

Additional rules that follow from this:

- **Schema changes = new migration files only.** Never edit a migration that has already run; create a new one (`add_x_to_y_table`, `change_x_in_y_table`).
- Never run `php artisan migrate:rollback` without asking me first.
- Migrations must not drop columns or tables containing data without my explicit approval in the conversation.
- **Seeders must be additive and idempotent** (`firstOrCreate` / `updateOrCreate`), must never truncate or delete, and run only as `php artisan db:seed --class=SpecificSeeder` when I ask.
- **Tests never touch the development MySQL database.** `phpunit.xml` / Pest must point to an isolated test database (SQLite `:memory:` by default). `RefreshDatabase` is allowed **only** there. If the test DB config ever points at the dev database, stop and tell me.
- If a migration fails or data looks wrong, report the exact error and your proposed fix — do not wipe or recreate tables.

---

## 12. Security Checklist (every change)

- Tenant scope applied; no `company_id` from input; policy checks on every action.
- Form Request validation on every write; uploads validated by mime and size.
- No secrets in frontend code, logs or API responses; password fields never returned.
- Login and sensitive endpoints rate-limited.
- Public endpoints (`/i/{token}`, landing) expose only what is needed and use unguessable tokens.

---

## 13. Reference Data

- **Default task stages:** To Do (#6B7280, 1), In Progress (#3B82F6, 2), Cancelled (3), Done (#10B981, 4, done stage).
- **Default expense categories:** Travel #3B82F6, Office Supplies #10B77F, Software #8B5CF6, Marketing #F59E0B, Meals #EF4444.
- **Seed plans:** Free $0 (3 projects, 1 GB, no AI, default) · Starter $19.99/mo, $191.90/yr (25 projects, 5 GB, no AI, 7-day trial) · Pro $49.99/mo, $479.90/yr (unlimited, 50 GB, AI, 14-day trial, recommended).
- **Priorities:** Low, Medium, High, Urgent. **Project status:** Active, Completed, On Hold, Inactive. **Invoice status:** Draft, Sent, Partial, Paid. **Contract status:** Draft, Pending, Signed, Active, Completed, Cancelled. **Contract types:** Fixed, Hourly, Retainer, Milestone-based. **Plan request status:** Pending, Approved, Rejected. **Coupon types:** Percentage, Flat Amount.
- **Seeded accounts:** `superadmin@example.com` (super_admin) and `company@example.com` (company), password `password` — created by an idempotent seeder.
