# Task SaaS — Product Requirements Document (PRD)

> **Product:** TASK — Task Management Software with Team Collaboration & Calendar (SaaS edition)
> **Version:** 1.0 (initial build spec)
> **Stack:** Next.js 16 (frontend) · Laravel 13 (backend API) · Laravel Breeze API stack + Sanctum (auth) · MySQL 8
> **Build tool:** Claude Code
> **Status:** Draft for implementation

---

## 1. Product Overview

### 1.1 Summary
TASK is a multi-tenant, subscription-based task and project management platform. A **Super Admin** runs the platform and sells subscription plans. Each **Company** (tenant) signs up, picks a plan, and uses a dedicated workspace to plan projects, assign and track tasks on a Kanban board, log billable time, manage clients, and handle the financial side of each project — contracts, expenses, invoices, and payments.

It is modeled on WorkDo's Task SaaS: businesses create dedicated workspaces, manage projects from planning to completion, record billable time, and collaborate with clients from a single cloud platform. The SaaS layer adds plan-based billing, coupons, referral, integrations (Zoom, AI), cloud storage limits, and enterprise customization (branding, landing page, email templates, languages).

### 1.2 Goals
1. Let a small business run projects end-to-end: project → milestones → tasks → time → invoice → payment.
2. Give the platform owner a complete SaaS back office: companies, plans, plan requests/orders, coupons, revenue analytics.
3. Enforce plan limits (project count, storage, AI feature) automatically.
4. Provide a clean, consistent, responsive UI with dark mode and multi-language support.

### 1.3 Non-Goals (v1)
- Native mobile apps.
- Real-time multi-user editing (live cursors, websockets) — polling/refetch is enough for v1.
- Company staff/team-member accounts with granular permissions (data model must allow it later — see §15).
- Client portal login (clients are records only in v1 — see §15).

### 1.4 Target Users
- **Platform owner** (Super Admin) — sells and manages subscriptions.
- **Small business owners / agencies / freelancers** (Company) — manage projects, clients, time, and billing.

---

## 2. Roles & Authentication

### 2.1 Roles
| Role | Description | Dashboard |
|---|---|---|
| `super_admin` | Platform owner. Manages companies, plans, coupons, currency, referral, landing page, email templates, global settings. | Admin Dashboard |
| `company` | Tenant account. Owns all its workspace data. Bound by its active plan. | User (Company) Dashboard |

### 2.2 Authentication Requirements
- **Two login pages, one per role.** Each page posts to its own endpoint, and each endpoint accepts **only its own role**:

  | | Company | Super Admin |
  |---|---|---|
  | Login page | `/login` | `/admin/login` |
  | Register page | `/register` | none — the account is seeded |
  | Login API | `POST /api/v1/auth/login` | `POST /api/v1/admin/auth/login` |
  | After login | `/dashboard` | `/admin/dashboard` |

- Logging in through the other role's page fails with **403 "These credentials do not match our records."** and creates no session. A wrong password returns 422 with the message under the Email field.
- **Registration** (`/register`, `POST /api/v1/auth/register`) always creates a `company` user and logs it in; the role can never be set from the request.
- **Logout** (`POST /api/v1/auth/logout`, both roles) invalidates the session, regenerates the CSRF token, clears client state and returns the user to their role's login page.
- Login form: Email*, Password*, "Remember me", "Forgot password?" link, Log in button. Login is rate-limited to 5 failed attempts per minute per email + IP (429 with a "try again in N seconds" message).
- **Quick Access** demo buttons — "Login as Company" on `/login`, "Login as Super Admin" on `/admin/login` — only rendered when demo mode is on (`APP_DEMO_MODE=true` backend, `NEXT_PUBLIC_DEMO_MODE=true` frontend).
- Language switcher and dark-mode toggle (top-right) on every auth page.
- Forgot password → email reset link → reset password page (Breeze flow).
- Auth mechanism: **Laravel Breeze API stack → Sanctum SPA cookie authentication** (CSRF cookie + session). No tokens in localStorage.
- A company whose login is disabled by the admin (`is_login_enabled = false`) cannot log in — show "Your account is disabled. Contact the administrator."
- Role-guarded route groups on both backend (middleware) and frontend (Next.js `proxy.ts` + layout guard). A company user hitting `/admin/*` gets 403/redirect and vice versa.
- **Impersonation:** Super Admin can "Login as Company" from the Companies list and return to admin ("Back to Admin" banner shown while impersonating).

### 2.3 Profile Settings (both roles)
- Tabs: **Profile** | **Password**.
- Profile: avatar upload (JPG, PNG, GIF, max 2 MB) with "Change Avatar", Name*, Email address*, Save.
- Update Password: Current password*, New password*, Confirm password*, Save.

---

## 3. Multi-Tenancy Model
- **Single database, shared schema.** Every tenant-owned table has a `company_id` column (FK → `users.id` where `type = company`).
- All tenant queries are scoped automatically by a `BelongsToCompany` trait / global scope using the authenticated company. A company must **never** read or write another company's data.
- Super Admin data (plans, coupons, currencies, landing page, email templates, global settings) is global (no `company_id`).
- On company creation: seed that company's defaults — 4 task stages (To Do, In Progress, Cancelled, Done), 5 expense categories, default settings — and assign the **default plan**.

---

## 4. Global UI / Layout

### 4.1 App Shell (both dashboards)
- **Sidebar:** "TASK" logo (the "T" accent in brand green), menu search box ("Search menu…" filters menu items), grouped nav with section headings, collapsible sub-menus, active item in green with left indicator. Sidebar can be collapsed via toggle.
- **Sidebar footer (company only):** avatar + "Company" + current plan name (e.g. "Pro") + **Upgrade** button → Plans page.
- **Top bar:** sidebar toggle, breadcrumbs (e.g. Dashboard › Financial › Contracts), **Start** timer button (company only), dark-mode toggle, language switcher (flag + name), user menu (avatar, name, email, dropdown: Profile Settings, Logout).
- **Floating helper button** (bottom-right, green circle) — AI assistant entry point (enabled only when the plan has AI Integration; otherwise hidden or shows upgrade prompt).

### 4.2 Standard List-Page Pattern
Every CRUD list page follows the same pattern:
- Page title + subtitle, primary green **"+ Add X"** button top-right.
- Optional stat cards row (label, big number, colored icon with soft circular background).
- Filter bar: search input, dropdown filters, optional date range, **Filters** button (advanced filters panel), **list / grid view toggle**.
- Optional status tabs with counts (e.g. All 12 · Active 6 · Completed 5 · On Hold 1).
- Data table: `#` column, sortable headers (⇅ icon), colored status/priority badges, avatar + initials for people, **Actions** column (view 👁, edit ✎, lock/toggle 🔒, delete 🗑).
- Footer: "Showing 1 to 10 of N results", "Rows per page" select (10/25/50/100), « Previous · page numbers · Next ».
- **Create/Edit** in a modal (Cancel / Save) unless the form is large (then a full page, e.g. Create Invoice, Create Plan).
- **View** in a details modal (icon + title header, labeled fields with icons).
- Delete always asks for confirmation.
- Empty states with icon + message (e.g. "No upcoming invoice deadlines").
- Toast notifications for success/error.

### 4.3 Visual Style
- Brand color: emerald/green (primary buttons, active states, success badges).
- Badges: soft background + colored text (green = Active/Paid/Approved, blue = Completed/Signed/Sent, amber = Pending/Partial, red = Rejected/Cancelled/Urgent/overdue, gray = Draft/Inactive).
- Monospace font for money amounts in tables and summaries.
- Cards with subtle borders and rounded corners; dark hero banner on dashboards.
- Full **dark mode**. Fully **responsive** (sidebar becomes a drawer on mobile).
- **i18n:** all UI strings translatable; English default; language switcher everywhere.

---

## 5. Company (User) Dashboard — Navigation

| Group | Items |
|---|---|
| Overview | Dashboard, Calendar |
| Project Management | Tasks, Projects, Time Tracker, Timesheets |
| Client Relations | Clients |
| Financial Management | Financial ▸ Invoices, Expenses, Contracts, Items |
| Meetings | Zoom Meetings |
| System Configuration | Configuration ▸ Task Stages, Expense Categories |
| Account & Billing | Plans ▸ Plan, Plan Request, Plan Orders; Referral Program |
| System Control | Notification Templates, Media Library, Settings |

---

## 6. Company Dashboard — Module Requirements

### 6.1 Dashboard
- **Header:** title "Dashboard", subtitle "Welcome to your company dashboard.", **Quick Access** button (dropdown of quick-create actions: Add Project, Add Task, Create Invoice, Add Client, Add Expense, Start Timer).
- **Hero banner (dark):** time-based greeting ("Good morning/afternoon/evening, {Company}"), "Here's what's happening across your company today.", "{n} active projects" indicator; right side: Projects count chip, Tasks Done % chip, shortcut icons (Projects, Tasks, Invoices, Clients).
- **Stat cards:**
  - Total Projects (+% change this month)
  - Active Tasks (n completed)
  - Total Clients (n active)
  - Total Revenue (sum of invoice totals) with "$X paid"
- **Performance Overview:**
  - Task Completion Rate = tasks in done stage / total tasks ("27 of 52 tasks done").
  - Invoice Payment Rate = paid invoices / total invoices ("5 of 16 invoices paid").
  - Profit Margin = (paid revenue − expenses) / paid revenue, with "Net: $X".
- **Project Progress:** project selector + "View all"; progress ring (% complete), project name, status badge, Total Budget, Spent (sum of expenses), Remaining.
- **Monthly Revenue:** line/area chart of **paid** invoice revenue per month for a selected year; total chip; year selector.
- **Timesheet Hours:** bar chart of logged hours per month for a selected year; "N h total" chip; year selector.
- **Upcoming Task Deadlines:** next tasks by due date (not in done stage): title, project, due date (red), priority badge.
- **Upcoming Invoice Deadlines:** unpaid invoices by due date, "View all"; empty state "No upcoming invoice deadlines".
- **Recent Contracts:** latest 5 — title, client avatar + name, amount, status badge; "View all".
- **Recent Tasks:** latest 5 by activity — title, project, stage badge, relative time ("4 months ago"); "View all".

### 6.2 Calendar
*(No screenshot — proposed design.)*
- Month / week / day views.
- Shows: task due dates (colored by priority or stage), project start/end dates, milestone due dates, invoice due dates, contract end dates, Zoom meetings.
- Filter by type and project. Clicking an event opens its details modal / page.

### 6.3 Projects

**List page**
- Stat cards: Total Projects, Active Projects, Completed, On Hold.
- Filters: search, All Priority, All Clients; list/grid toggle.
- Tabs with counts: All, Active, Completed, On Hold, Inactive.
- Columns: #, Name (sortable), Client (avatar + name + email), Priority badge, Status badge, Budget, Progress (bar + %), Actions (view, edit, lock, delete).

**Add / Edit Project (modal)**
| Field | Rules |
|---|---|
| Project Name* | required, max 255 |
| Description | optional text |
| Client* | required, select from company's clients |
| Start Date* | required date |
| End Date* | required, ≥ start date |
| Budget* | required decimal ≥ 0 |
| Priority | Low / Medium / High / Urgent (default Medium) |
| Status | Active / Completed / On Hold / Inactive (default Active) |

**Business rules**
- Creating a project checks the plan's **Maximum Projects** limit. If reached → block with "You've reached your plan's project limit. Upgrade to add more." + Upgrade button.
- **Progress %** = tasks in a done stage / total tasks of the project (0% if no tasks).

**Project Detail page** (`/projects/{id}`)
- Header: project name, subtitle, **Edit Project** and **Back** buttons; status and priority badges.
- Summary cards: Total Tasks (n completed), Expenses total ("Budget utilization"), Milestones done/total ("x% complete"), Contracts active/total.
- Tabs: **Overview · Milestones (n) · Items (n) · Notes (n) · Expenses (n) · Contracts (n) · Files (n)**.
- **Overview tab:** Project Description; Timeline (Created, Start Date, End Date); Project Information (Priority, Budget, Client); Budget Analysis donut (Spent vs Remaining with amounts and %); Milestone Progress (bar per milestone with %); Project Health ring (overall %, label Low/Medium/High) with Tasks Complete x/y, Overdue count, Milestones x/y.
- **Milestones tab:** CRUD — title*, description, start date, due date, progress %, status. Tasks can link to a milestone.
- **Items tab:** products/services attached to the project (from the Items catalog) with qty and price — used for invoicing.
- **Notes tab:** CRUD rich-text notes (title, content, created by, date).
- **Expenses tab:** project expenses list (same as Expenses module, filtered).
- **Contracts tab:** project contracts list (same as Contracts module, filtered).
- **Files tab:** upload/download/delete project files (counts toward storage limit).

**Project Health label rule:** overall = task completion %; Low < 40%, Medium 40–74%, High ≥ 75%.

### 6.4 Tasks

**Views:** Kanban board (default) and list view (toggle).
- Stat cards: Total Tasks, High Priority (High+Urgent), Low Priority (Low+Medium), Overdue.
- Filters: search, All Projects, All Milestones (enabled after a project is chosen), All Stages.
- Priority tabs with counts: All, Urgent, High, Medium, Low.
- **Kanban:** one column per active task stage in stage order, column header shows colored dot + stage name + count; columns scroll horizontally; each column scrolls vertically.
- **Task card:** title, "…" menu (View, Edit, Delete), priority badge, milestone badge (truncated), start date, due date (red when overdue), progress bar + %, project chip.
- **Drag & drop** cards between columns updates the task's stage (optimistic UI, persisted via API). Moving into a done stage sets progress to 100% and `completed_at`.

**Add / Edit Task (modal)**
| Field | Rules |
|---|---|
| Task Title* | required |
| Description | optional |
| Project* | required |
| Milestone | optional, filtered by selected project |
| Stage* | required, from active stages |
| Start Date* | required |
| Due Date* | required, ≥ start date |
| Priority | Low / Medium / High / Urgent (default Medium) |
| Progress (%) | 0–100 |

**Overdue rule:** due date < today AND stage is not a done stage (and not "Cancelled").

### 6.5 Time Tracker
- Live clock (HH:MM:SS AM/PM) with date and timezone badge (company timezone from Settings).
- **Start New Session** form: Project*, Task* (options depend on selected project), Description (optional, "What are you working on?"), **Start Tracking** button.
- While running: show running timer (elapsed), project/task, **Stop** button. Only **one running session per user** at a time.
- The top-bar **Start** button opens a quick start popover (same fields) and turns into a live running indicator / Stop button while a session is active, on every page.
- Stopping a session creates a **timesheet entry** (date, start time, end time, duration).

### 6.6 Timesheets
- Add Timesheet (manual entry) button.
- Filters: search, All Projects, All Tasks (depends on project); list/grid toggle.
- Columns: #, Date (sortable), Project, Task, Start Time, End Time, Duration ("2h 0m"), Actions (edit, delete).
- Add/Edit modal: Project*, Task*, Date*, Start Time*, End Time* (> start), Description, Billable (default yes).
- Duration computed server-side.

### 6.7 Clients
- Columns: #, Name (avatar initials + name + email; sortable), Phone, Company (badge), Website (link badge, opens in new tab), Status (Active/Inactive), Actions (view, edit, lock, delete).
- Filters: search (name, email, company, phone), All Status, Filters panel (Created At date range); list/grid toggle.
- Add/Edit modal (single column): Client Name*, Email* (unique within the company), Phone*, Company*, Address* (textarea), Website (http/https URL), Status (default Active), Notes (textarea).
- **Client Details modal:** Client Name, Email, Phone, Company, Website, Status, Address, Notes (only when present), Created At.
- A client with projects/invoices cannot be deleted (show reason) — deactivate instead. *(Guard to be wired when Projects and Invoices exist; until then delete is a plain soft delete.)*

### 6.8 Financial ▸ Invoices

**List page**
- Create Invoice button (full page).
- Filters: search, All Status, All Clients, All Projects, date range (from / to on invoice date).
- Columns: #, Invoice Number (badge, e.g. `INV-2026-0015`), Client (avatar + name + email), Project (badge), Invoice Date, Due Date (red + "overdue" label when past due and balance > 0), Total Amount, Balance Due (green $0.00 when paid, amber when partial), Status (Paid / Partial / Draft / Sent), Actions.
- **Edit/Delete only allowed for Draft and Sent invoices**; Paid and Partial invoices are view-only.

**Create / Edit Invoice page**
- **Invoice Details:** Invoice Date* (default today), Due Date*, Client*, Project* (filtered by client), Tax (multi-select from tax rates), Discount Amount (default 0).
- **Invoice Items:** repeatable rows — Type (Item / Task), Item/Task* (from Items catalog or project tasks), Qty (default 1), Price, Total (auto), expandable description, collapse ▲ and delete 🗑; "+ Add another item"; footer "✓ n items added".
- **Invoice Summary** (sticky right card): Subtotal, Discount (red, negative), Tax (x%), **Total**.
- **Notes** card: additional notes.
- Buttons: Cancel, **Create Invoice**.
- Invoice number auto-generated per company per year: `INV-{YYYY}-{NNNN}`.

**Invoice View page** (`/invoices/{id}`)
- Header actions: **Print**, **Add Payment**, **Send Invoice** (email to client), **Copy Link** (public share link), **Send Reminder**, **Back**.
- **Billing & Addresses:** Billed From (company name, email, phone, address from Settings); Billed To (client name, email, phone, address); Project name + description; status badge; **QR code** linking to the public invoice URL ("Scan to view online").
- **Invoice Items** table: Description, Qty, Unit Price, Total.
- Totals: Subtotal, Discount, Tax, **Total Amount**, Paid Amount, **Balance Due**.
- **Payment History:** Date, Amount, Payment Type (Credit card / Bank transfer / Cash / Cheque / Other), Reference (e.g. `PAY000006`), Status, Receipt (file link), Description, Action (delete).
- Right column: Customer Info card, Invoice Details card (number, invoice date, due date), Additional Notes card.

**Status rules**
- New invoice = **Draft**. "Send Invoice" → **Sent**.
- Payments: 0 < paid < total → **Partial**; paid ≥ total → **Paid**. Deleting a payment recalculates status.
- Payment amount cannot exceed balance due.
- Public invoice page (`/i/{token}`) is read-only and requires no login.

### 6.9 Financial ▸ Expenses
- Layout: left panel lists **projects**; selecting a project shows its categories with counts (All Categories + each category); right side shows a project header card: **Total Budget · Total Spent · Remaining**.
- Search expenses.
- Columns: #, Title (+ project name), Category (colored badge), Amount, Date, Actions (view, edit, delete).
- Add/Edit modal: Project*, Title*, Description, Amount*, Date*, Category*.
- **Expense Details modal:** Title, Amount, Project, Category, Expense Date, Description.
- Optional receipt attachment (counts toward storage).

### 6.10 Financial ▸ Contracts
- Stat cards: Total, Active, Pending, Completed, Cancelled.
- Filters: search, All Status, All Types, All Clients, All Projects.
- Columns: #, Title (+ project name), Client (avatar, name, email), Status, Contract Duration ("3 Months" + date range + progress bar of elapsed time), Amount, Actions (view, edit, delete).
- Add/Edit modal:
| Field | Rules |
|---|---|
| Contract Title* | required |
| Description | optional |
| Project* | required |
| Client | auto-filled from the selected project (read-only; hint "Client is automatically selected based on the chosen project") |
| Amount* | decimal ≥ 0 |
| Start Date* / End Date* | end ≥ start |
| Contract Type* | Fixed (default), Hourly, Retainer, Milestone-based |
| Status | Draft (default), Pending, Signed, Active, Completed, Cancelled |
| Terms & Conditions | long text |
- Duration label computed (months / years).
- Contract view page/modal with printable layout.

### 6.11 Financial ▸ Items
*(No screenshot — proposed design.)*
- Catalog of products/services used in invoices and project Items tab.
- Fields: Name*, Type (Product / Service), Unit (hour, piece, …), Price*, Tax (optional default), Description, Status.
- Also manage **Tax rates** here or in Settings: Name, Rate %.

### 6.12 Zoom Meetings
*(No screenshot — proposed design.)*
- List: Title, Project, Start Date/Time, Duration, Status (Scheduled / Started / Ended), Join link, Actions.
- Create modal: Title*, Project, Client(s)/participants, Start date & time*, Duration (min)*, Password, Description.
- Integration via Zoom Server-to-Server OAuth credentials entered in Settings (per company). If not configured → show setup prompt.
- Meetings appear on the Calendar.

### 6.13 Configuration ▸ Task Stages
- Stat cards: Total Stages, Active Stages, **Done Stage** (the done stage's name), Inactive Stages.
- Filters: search, All Status, Filters panel (Created At range). No view toggle and no pagination — the whole workflow is always listed.
- **Workflow Stages** list of stage cards (not a table): drag handle ⋮⋮, `Order: n`, color dot, name, **Done Stage** badge (done stage only), status badge, task count, actions (view, edit, lock, delete).
- **Drag-to-reorder** by the handle (mouse, touch or keyboard) rewrites `order` (contiguous 1..n) in one request; disabled while a search or filter is active ("Clear filters to reorder").
- Add/Edit modal: Stage Name*, Description, Color (color picker + hex input, default `#3B82F6`), Order (empty = at the end; a position inserts there), Status (Active/Inactive), ☐ Mark as Done Stage (warns that the done flag moves; locked on the current done stage).
- **Task Stage Details modal:** Stage Name, status badge, done/regular badge, Color (swatch + hex), Order, Description, Created At.
- Rules: **exactly one** done stage per company (marking another moves the flag); the done stage is always active and can't be unset, deactivated or deleted; at least one stage stays active; deleting renumbers the rest; a stage with tasks cannot be deleted (move tasks first) *(guard wired when Tasks exist; task counts read 0 until then)*; Kanban columns follow this order; stage colors drive Kanban column dots.
- Defaults per new company: To Do (#6B7280, 1), In Progress (#3B82F6, 2), Cancelled (#6B7280, 3), Done (#10B981, 4, done stage).

### 6.14 Configuration ▸ Expense Categories
- Split layout: left **Add New Expense Category** form (Category Name*, Status, Description, Color picker + hex, **Add Category** button); right: search + Search button, All Statuses filter, table (Name + description, Color swatch + hex, Status, Actions: lock, edit, delete).
- Defaults: Travel (#3B82F6), Office Supplies (#10B77F), Software (#8B5CF6), Marketing (#F59E0B), Meals (#EF4444).
- A category in use cannot be deleted — deactivate instead.

### 6.15 Plans (company side)
- **Choose Your Plan** page: Monthly / Yearly toggle ("Save 20%" badge).
- Plan cards: name, price per period, description, trial badge ("7 days free trial"), WHAT'S INCLUDED (Projects count or Unlimited, Storage), FEATURES (AI Integration ✓/✗), "Recommended" ribbon on the highlighted plan, buttons:
  - **Request Plan** (manual request → admin approval)
  - **Start N Day Trial** (only if plan has trial enabled and company hasn't used a trial for it)
  - **Subscribe Now** (checkout with coupon code → payment → plan order)
- Current plan shows a **"Current"** badge and a disabled **"Current Plan"** button.
- Seed plans:
| Plan | Monthly | Yearly | Projects | Storage | AI | Trial |
|---|---|---|---|---|---|---|
| Free (default) | $0.00 | $0.00 | 3 | 1 GB | ✗ | — |
| Starter | $19.99 | $191.90 | 25 | 5 GB | ✗ | 7 days |
| Pro (recommended) | $49.99 | $479.90 | Unlimited | 50 GB | ✓ | 14 days |

### 6.16 Plan Request (company side)
- "View the status of your submitted plan upgrade requests."
- Columns: #, Company (avatar, name, email), Plan (badge), Plan Duration (Monthly/Yearly), Status (Approved / Pending / Rejected), Requested At.
- Filters: search, All Status. Only one pending request at a time.

### 6.17 Plan Orders (company side)
*(No screenshot — proposed design.)*
- Order history: Order ID, Plan, Duration, Amount, Coupon, Discount, Final Amount, Payment Method, Status (Pending / Approved / Rejected / Failed), Date, receipt/invoice download.

### 6.18 Referral Program (company side)
*(No screenshot — proposed design.)*
- Referral link + copy button, stats (referred companies, earned commission, balance), referred list, payout request form, payout history.
- Commission rules come from the admin Referral Program settings.

### 6.19 Notification Templates (company side)
*(No screenshot — proposed design.)*
- Editable templates for notifications the company sends (Invoice Sent, Payment Received, Invoice Reminder, Task Assigned, Contract Created) with placeholders (`{client_name}`, `{invoice_number}`, `{amount}`, `{due_date}`, `{invoice_link}`, `{company_name}`), per language, active toggle.

### 6.20 Media Library (both roles)
*(No screenshot — proposed design.)*
- Grid/list of uploaded files (images, PDFs, docs), upload (drag & drop), search, filter by type, preview, copy URL, delete.
- Shows storage used vs plan limit (company) with progress bar. Uploads blocked when limit reached.

### 6.21 Settings (company side)
*(No screenshot — proposed design.)* Tabs:
- **Company Settings:** company name, logo, email, phone, address, city, state, zip, country, tax number.
- **System Settings:** default language, timezone, date format, time format, currency (from admin-managed currencies), currency symbol position.
- **Invoice Settings:** invoice prefix (default `INV`), starting number, default notes/footer, default due days, tax rates.
- **Email / SMTP Settings** (optional per company; fallback to platform SMTP).
- **Zoom Settings:** account ID, client ID, client secret.
- **AI Settings** (if plan has AI): enable/disable assistant.

---

## 7. Super Admin Dashboard — Navigation

| Group | Items |
|---|---|
| Overview | Dashboard |
| Management | Companies, Media Library, Plans ▸ Plan, Plan Request, Plan Orders; Coupons, Currency, Referral Program, Landing Page ▸ … |
| System Control | Email Templates, Settings |

Top bar: sidebar toggle, breadcrumbs, dark mode, language, user menu (no timer button, no plan badge).

---

## 8. Super Admin — Module Requirements

### 8.1 Admin Dashboard
- Header: "Dashboard", "System overview — companies, revenue, plans and recent activity.", **Refresh** button.
- **Hero banner:** "Good {time}, Super Admin", "Here's what's happening across your platform today.", "{n} registered companies"; chips: Companies count, Growth %; shortcuts: Coupons, Referral, Settings.
- **Stat cards:** Total Revenue (from approved orders), Total Companies (+% this month), Active Plans (subscription plans), Monthly Growth (vs last month), Pending Requests (awaiting approval, "Action needed" badge when > 0).
- **Recently Registered Companies:** avatar, name, email, status, relative time; View all.
- **Top Plans** (by revenue generated): rank, plan name, revenue bar, subscribers count, revenue; View all.
- **New Companies Registered:** bar chart per month for selected year, total chip, tooltip ("August 2026 — Companies: 11").
- **Monthly Revenue:** line/area chart of approved plan-order revenue per month, total chip, year selector.

### 8.2 Companies
- Header buttons: history icon (activity / login history — see §15), **+ Add Company**.
- Filters: search, All Status, date range (created at); list/grid toggle.
- Columns: #, Name (avatar, name, email), Plan (badge), Status (Active/Inactive), Created At, Actions:
  - ↗ **Login as company** (impersonate)
  - ⓘ **Company info** (details modal: profile, plan, plan expiry, projects used, storage used, created at)
  - 💳 **Upgrade / change plan** (select plan + duration; manually assign)
  - 🔑 **Reset password**
  - 🔒 **Enable/disable login**
  - ✎ Edit, 🗑 Delete (with confirmation; soft delete)
- **Add New Company modal:** Company Name*, Email*, **Enable Login** toggle. When Enable Login is on, show Password* (+ confirm). New company gets the default plan and default seed data.

### 8.3 Plans (admin)
- "Subscription Plans — Create and manage subscription plans to offer different service tiers to your customers."
- Monthly/Yearly toggle (Save 20%), **+ Add Plan**.
- Plan cards show badges **Default** / **Active**, pricing, trial badge, included limits, features, and a footer with **Active toggle**, edit, delete. The default plan cannot be deleted or deactivated; a plan with subscribers cannot be deleted.

**Create / Edit Plan page**
| Field | Rules |
|---|---|
| Plan Name* | required, unique |
| Maximum Projects* | integer; `-1` = Unlimited |
| Monthly Price* | decimal ≥ 0 |
| Storage Limit (GB)* | decimal ≥ 0 |
| Yearly Price (Optional) | if empty → `monthly × 12 × 0.8` (hint: "If left empty, yearly price will be calculated as 80% of monthly price × 12") |
| Trial Days | integer ≥ 0 |
| Description | text |
| Features: AI Integration | toggle |
| Features: Enable Trial | toggle (trial days required when on) |
| Settings: Active | toggle (default on) |
| Settings: Default Plan | toggle — "Setting this as default will remove default status from the current default plan." |

Buttons: Cancel, **Create Plan**; Back link.

### 8.4 Plan Requests (admin)
- "View and manage all plan requests from companies."
- Columns: #, Company, Plan, Plan Duration, Status, Requested At, Actions (✓ approve, ✗ reject — only on **Pending** rows).
- Approve → assign plan to company, set `plan_expires_at` = now + 1 month/year, create an approved plan order (amount per plan price, marked "manual"), notify company by email.
- Reject → status Rejected, notify company.

### 8.5 Plan Orders (admin)
*(No screenshot — proposed design.)*
- All orders: Order ID, Company, Plan, Duration, Price, Coupon, Discount, Final Amount, Payment Method (Stripe / Bank Transfer / Manual), Payment Status, Date, Actions (view, approve/reject for bank transfers, view receipt).
- **Revenue** figures on the admin dashboard use approved orders only.

### 8.6 Coupons
- Filters: search, All Types, All Status.
- Columns: #, Name, Code (monospace chip), Type (Percentage / Flat Amount), Min Spend, Max Spend, Discount (e.g. 50% or $100.00), Coupon Limit (total uses or Unlimited), User Limit (per company or Unlimited), Expiry Date, Status (**toggle switch**), Actions (view, edit, delete).
- **Add / Edit Coupon modal:**
| Field | Rules |
|---|---|
| Coupon Name* | required |
| Discount Type* | Percentage / Flat Amount |
| Discount Value* | > 0; ≤ 100 if percentage |
| Total Usage Limit | empty = unlimited |
| Code Generation* | ◉ Manual Entry / ○ Auto Generate |
| Coupon Code* | required & unique (auto-filled, uppercase, when Auto Generate) |
| Minimum Spend ($) | optional |
| Maximum Spend ($) | optional, ≥ min |
| Usage Limit Per User | empty = unlimited |
| Expiry Date | optional date |
- Validation on checkout: active, not expired, total and per-company limits not exceeded, order amount within min/max spend.

### 8.7 Currency
*(No screenshot — proposed design.)*
- CRUD currencies: Name, Code (USD), Symbol ($), Exchange rate (optional), Default toggle, Status. Default currency is used for plan pricing; companies pick their own currency in Settings.

### 8.8 Referral Program (admin)
*(No screenshot — proposed design.)*
- Settings: enable program, commission % (on first paid order), minimum payout threshold, guidelines text.
- Tables: referral transactions (referrer, referred company, plan, order amount, commission), payout requests (approve/reject).

### 8.9 Landing Page
*(No screenshot — proposed design.)*
- Sub-menus: Sections, Features, Testimonials, FAQ, Pages (custom pages), SEO.
- Edits the public marketing site (`/`): hero (title, subtitle, CTA, image), features grid, pricing (auto from active plans), testimonials, FAQ, footer links, contact info. Toggle each section on/off.

### 8.10 Email Templates
*(No screenshot — proposed design.)*
- Platform emails: Welcome / New Company, Password Reset, Plan Request Approved, Plan Request Rejected, Plan Order Receipt, Trial Ending, Plan Expired.
- Fields: subject, body (rich text) with placeholders, language, active toggle.

### 8.11 Settings (admin)
*(No screenshot — proposed design.)* Tabs:
- **Brand:** app name, logo (light/dark), favicon, footer text, primary color.
- **System:** default language, available languages, timezone, date format, default currency, sign-up enabled, email verification required, demo mode.
- **Email (SMTP):** host, port, username, password, encryption, from address/name, "Send test email".
- **Payment:** Stripe (key/secret, enable), Bank transfer (instructions, enable), other gateways later.
- **Storage:** local / S3 (key, secret, region, bucket).
- **AI:** provider API key (for AI Integration feature).
- **Cookie consent & SEO** basics.

---

## 9. SaaS Billing Logic
- Company fields: `plan_id`, `plan_duration` (monthly/yearly), `plan_expires_at`, `trial_ends_at`, `used_trial_plan_ids`.
- **Subscribe flow:** choose plan + duration → optional coupon (validated) → payment (Stripe checkout or bank transfer with receipt upload) → plan order created → on success/approval, plan assigned and expiry set.
- **Request flow:** Request Plan → plan request (Pending) → admin approves/rejects.
- **Trial flow:** Start Trial → plan assigned with `trial_ends_at = now + trial_days`; one trial per plan per company.
- **Expiry:** a daily scheduled job downgrades companies whose plan/trial has expired to the default plan and emails them. Data is kept; if over the new project limit, existing projects remain but new ones are blocked.
- **Limit enforcement (server-side, always):** max projects on project create; storage on every upload (sum of stored file sizes); AI endpoints require `ai_integration`.

---

## 10. Data Model (MySQL)

All tables have `id`, `created_at`, `updated_at`. Tenant tables have `company_id` (indexed, FK → users). Money uses `DECIMAL(15,2)`. Soft deletes on users, clients, projects, tasks, invoices, contracts.

| Table | Key columns |
|---|---|
| `users` | name, email (unique), password, type (`super_admin`/`company`), avatar, is_login_enabled, status, plan_id, plan_duration, plan_expires_at, trial_ends_at, referral_code, referred_by, lang, remember_token, email_verified_at, deleted_at |
| `plans` | name, description, monthly_price, yearly_price, max_projects (-1 = unlimited), storage_limit_gb, trial_enabled, trial_days, ai_integration, is_active, is_default, is_recommended, sort_order |
| `plan_requests` | company_id, plan_id, duration, status (pending/approved/rejected), actioned_by, actioned_at |
| `plan_orders` | order_code, company_id, plan_id, duration, price, coupon_id, discount, final_amount, payment_method, payment_status, transaction_id, receipt_path |
| `coupons` | name, code (unique), type (percentage/flat), value, min_spend, max_spend, usage_limit, per_user_limit, expiry_date, is_active |
| `coupon_usages` | coupon_id, company_id, plan_order_id |
| `currencies` | name, code, symbol, exchange_rate, is_default, is_active |
| `referral_transactions` / `referral_payouts` | referrer_id, referred_id, plan_order_id, commission / amount, status |
| `landing_page_sections` | key, content (JSON), is_enabled, sort_order |
| `email_templates` | key, lang, subject, body, is_active |
| `settings` | company_id (nullable = global), key, value — unique(company_id, key) |
| `media` | company_id, disk, path, original_name, mime, size_bytes, uploaded_by |
| `clients` | company_id, name, email, phone, company_name, website, address, status |
| `projects` | company_id, client_id, name, description, start_date, end_date, budget, priority, status |
| `milestones` | company_id, project_id, title, description, start_date, due_date, progress, status |
| `project_notes` | company_id, project_id, title, content, created_by |
| `project_files` | company_id, project_id, media_id |
| `project_items` | company_id, project_id, item_id, quantity, price |
| `task_stages` | company_id, name, description, color, order, is_done_stage, status |
| `tasks` | company_id, project_id, milestone_id, task_stage_id, title, description, start_date, due_date, priority, progress, completed_at, created_by |
| `time_sessions` | company_id, user_id, project_id, task_id, description, started_at, stopped_at (null = running) |
| `timesheets` | company_id, user_id, project_id, task_id, date, start_time, end_time, duration_minutes, description, is_billable |
| `items` | company_id, name, type, unit, price, tax_id, description, status |
| `taxes` | company_id, name, rate |
| `invoices` | company_id, client_id, project_id, invoice_number (unique per company), invoice_date, due_date, subtotal, discount_amount, tax_amount, total, paid_amount, balance_due, status (draft/sent/partial/paid), notes, public_token, sent_at |
| `invoice_items` | invoice_id, type (item/task), item_id, task_id, description, quantity, price, total |
| `invoice_taxes` | invoice_id, tax_id, name, rate, amount |
| `invoice_payments` | company_id, invoice_id, payment_date, amount, payment_type, reference, status, receipt_path, description |
| `expense_categories` | company_id, name, description, color, status |
| `expenses` | company_id, project_id, expense_category_id, title, description, amount, expense_date, receipt_path |
| `contracts` | company_id, project_id, client_id, title, description, amount, start_date, end_date, type, status, terms |
| `zoom_meetings` | company_id, project_id, title, start_at, duration_minutes, password, join_url, start_url, zoom_meeting_id, status |
| `notification_templates` | company_id, key, lang, subject, body, is_active |
| `activity_logs` | company_id, user_id, subject_type, subject_id, action, meta (JSON) |

Indexes: `(company_id, status)`, `(company_id, due_date)` on tasks/invoices, `(project_id)` on child tables, unique `(company_id, invoice_number)`.

---

## 11. API Design (Laravel)
- Base: `/api/v1`. JSON only. Sanctum SPA cookie auth (`/sanctum/csrf-cookie` then Breeze `/login`, `/logout`, `/forgot-password`, `/reset-password`), `/api/v1/me` returns user + role + plan + limits + usage.
- Route groups:
  - `/api/v1/admin/*` — middleware `auth:sanctum`, `role:super_admin`
  - `/api/v1/*` (company) — middleware `auth:sanctum`, `role:company`, `plan.active`
  - `/api/v1/public/*` — public invoice view, landing page content, plans list
- REST resources per module (`index`, `store`, `show`, `update`, `destroy`) + custom actions: `tasks/{id}/move`, `task-stages/reorder`, `time-sessions/start|stop|current`, `invoices/{id}/send|remind|payments`, `plan-requests/{id}/approve|reject`, `companies/{id}/impersonate|reset-password|toggle-login|change-plan`, `coupons/validate`, `dashboard/stats`, `dashboard/charts?year=`.
- List endpoints support `search`, filters, `sort`, `direction`, `page`, `per_page` and return Laravel pagination meta.
- Response shape: API Resources; errors `{ message, errors }` with proper HTTP codes (401, 403, 404, 422, 429).
- Authorization: Policies per model (tenant ownership + role). Validation: Form Requests.

---

## 12. Frontend (Next.js 16)
- App Router, TypeScript strict, `src/` layout.
- Route groups: `(auth)` → `/login`, `/forgot-password`, `/reset-password/[token]`; `(company)` → `/dashboard`, `/calendar`, `/tasks`, `/projects`, `/projects/[id]`, `/time-tracker`, `/timesheets`, `/clients`, `/invoices`, `/invoices/create`, `/invoices/[id]`, `/invoices/[id]/edit`, `/expenses`, `/contracts`, `/items`, `/zoom-meetings`, `/configuration/task-stages`, `/configuration/expense-categories`, `/plans`, `/plans/requests`, `/plans/orders`, `/referral`, `/notification-templates`, `/media`, `/settings`, `/profile`; `(admin)` → `/admin/dashboard`, `/admin/companies`, `/admin/media`, `/admin/plans`, `/admin/plans/create`, `/admin/plans/[id]/edit`, `/admin/plans/requests`, `/admin/plans/orders`, `/admin/coupons`, `/admin/currencies`, `/admin/referral`, `/admin/landing-page/*`, `/admin/email-templates`, `/admin/settings`, `/admin/profile`; `(public)` → `/` landing, `/i/[token]` public invoice.
- Shared components: AppShell, Sidebar, Topbar, Breadcrumbs, StatCard, DataTable (sorting, pagination, rows per page), FilterBar, StatusBadge, PriorityBadge, AvatarInitials, FormModal, DetailsModal, ConfirmDialog, EmptyState, ColorPicker, DateRangePicker, MoneyText, Kanban board, charts.

---

## 13. Non-Functional Requirements
- **Security:** tenant isolation enforced server-side on every query; policies on every model; CSRF; rate-limited login (5/min); passwords hashed (bcrypt/argon); file uploads validated (mime + size) and stored outside public root or via signed URLs; no secrets in the frontend; impersonation logged.
- **Performance:** list endpoints paginated; eager-load relations (no N+1); dashboard stats cached per company for 5 min and busted on writes; p95 API < 300 ms for list pages on seeded data.
- **Reliability:** DB changes only through additive migrations; scheduled jobs (plan expiry, invoice reminders) via Laravel scheduler + queue.
- **Accessibility:** keyboard-navigable modals/menus, visible focus, labels on all inputs, color not the only status signal.
- **i18n:** all strings via translation files (frontend and backend emails).
- **Browser support:** latest Chrome, Edge, Firefox, Safari; responsive down to 360 px.
- **Testing:** Pest feature tests for every endpoint including tenant-isolation tests; frontend type-check + lint + build must pass.

---

## 14. Milestones (Build Order)
1. **Foundation** — monorepo, Laravel 13 + Breeze API + Sanctum, Next.js 16 app shell, auth, roles, tenancy trait, design system components, dark mode, i18n scaffolding.
2. **Admin core** — plans (CRUD + seed), companies (CRUD, impersonate, toggle login, reset password, change plan), admin profile.
3. **Company core** — clients, projects (list + detail tabs), task stages, tasks (Kanban + list + drag & drop), milestones.
4. **Time** — time tracker (global start/stop), timesheets.
5. **Financial** — items & taxes, expense categories, expenses, contracts, invoices (create/view/payments/print/public link/QR/send/remind).
6. **Dashboards** — company dashboard and admin dashboard stats + charts.
7. **SaaS billing** — plan page, requests, orders, coupons, trials, expiry job, limit enforcement, currency.
8. **Extras** — calendar, media library, Zoom, notification & email templates, settings, referral, landing page, AI helper.
9. **Hardening** — tests, performance pass, security review, demo seeders, deployment docs.

---

## 15. Open Questions / Assumptions
| # | Topic | Assumption until decided |
|---|---|---|
| 1 | Payment gateway for "Subscribe Now" | Stripe + manual bank transfer |
| 2 | Company staff / team members (collaboration) | Not in v1; `users.company_id` reserved for future staff accounts |
| 3 | Client portal login | Not in v1 |
| 4 | Lock icon on list rows (projects, clients, stages) | Toggle active/inactive status |
| 5 | Companies "history" icon | Opens activity / login history log |
| 6 | Contract types list | Fixed, Hourly, Retainer, Milestone-based |
| 7 | AI Integration scope | Floating assistant: summarize project, draft task descriptions, draft invoice notes |
| 8 | Public sign-up | Enabled via admin setting; new companies get default plan |
| 9 | Proposed designs (§6.2, 6.11, 6.12, 6.17–6.21, 8.5, 8.7–8.11) | Built as described here; to be validated against real screenshots if provided |

---

## 16. Acceptance Criteria (global)
- Both roles can log in from one page and land on their dashboard; cross-role access is blocked (API 403 + frontend redirect).
- Company A can never see or modify Company B's data (verified by automated tests).
- Every list page supports search, filters, sorting, pagination, and view/create/edit/delete per §4.2.
- Plan limits are enforced server-side and surfaced in the UI with an upgrade prompt.
- Invoice totals, balances, and statuses are always consistent after any payment add/delete.
- Dark mode and language switching work on every page.
- All automated tests, lint, and type checks pass before a module is considered done.
