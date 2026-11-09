# Kuldetek Auditing - Detailed README

This README was generated automatically from the repository contents. It documents features, architecture, key files, setup steps, and development guidance for the Kuldetek Auditing auditing and compliance platform (also referred to in code as Quillminds / Kuldetek Auditing).

## Table of Contents

- Project overview
- Key features
- Architecture & tech stack
- File / folder overview (selected highlights)
- Pages & routes
- API endpoints
- Database & migrations
- Authentication & middleware
- Client-side utilities and components
- Styling, themes and UI system
- Scripts and development commands
- Environment variables
- Testing, linting, and build
- Deployment notes
- Developer notes & next steps
- Appendix: Notable files and summaries

## Project overview

Kuldetek Auditing is a Next.js application focused on security auditing, compliance tracking, and alert management. It integrates with Supabase for authentication and data storage, provides a dashboard with charts, audit workflows (wizard), saved analyses, sharing, reporting, and PDF generation.

The repository also contains SQL migration files used to create tables for audits, notifications, sharing, and saved analyses.

Note: some package.json metadata and config values reference `Quillminds` (likely a prior project name). The app is currently structured as a modern Next.js app using server and client components alongside client-only pages.

## Key features

- Authentication and protected routes using Supabase
- Admin-style user management and roles stored in a `profiles` table (SQL migrations included)
- Interactive Dashboard with metrics, charts (Recharts), and alerts
- Audit CRUD flows and Audit Wizard (multi-step) for creating audits
- Audit fieldwork/inspection pages and task detail pages
- Notifications / system alerts table and UI
- Analysis and Saved Analyses with sharing endpoints and migrations
- PDF generation of audits/reports (html2canvas, jspdf, html2pdf.js)
- Theme switching (dark/light) and UI primitives using a shadcn-inspired UI folder
- API routes for analyze, reports, notifications, and sharing
- Utilities for Supabase client/server helpers

## Architecture & tech stack

- Framework: Next.js 15 (app router)
- UI: React 19, Recharts for charts, react-icons, shadcn-ui inspired primitives in `components/ui`
- Authentication & DB: Supabase (client and server helpers in `utils/supabase`)
- Styling: Tailwind CSS (tailwind v4 + PostCSS config present), custom CSS files `Dashboard.css`, `modern-dashboard.css`, `globals.css`
- PDF generation: `html2canvas`, `html2pdf.js`, `jspdf`
- Form handling: `react-hook-form` and `zod` (validation)
- Dev tooling & lint: ESLint, Next's linting config

## File / folder overview (selected highlights)

Top-level:

- `package.json` - project dependencies and scripts
- `README.md` - human-written project overview (existing)
- `README_GENERATED.md` - this file (auto-generated)
- `config.js` - small runtime config (appName, domainName, etc.)
- `middleware.js` - route protection using Supabase sessions
- `setup_database.sql` - helper script to create DB schema
- `migrations/` and `*.sql` - SQL migrations for notifications, sharing, profiles, saved analyses

App folder (`/app`):

- `layout.js` - Root layout for the app with ThemeProvider and Toaster
- `page.js` - Root page that redirects to `/sign-in`
- `(login)/sign-in/page.jsx` & `(login)/sign-up/page.jsx` - authentication pages
- `dashboard/` - main protected dashboard area with multiple subpages:
  - `page.jsx` - Dashboard UI with charts and metrics
  - `layout.jsx` - dashboard layout (probably contains sidebar/wrapping)
  - `audits/`, `audit-wizard/`, `audit-fieldwork/`, `analysis/`, `reports/`, `notifications/`, `settings/` etc.

Components (`/components`):

- `Sidebar.jsx` - application sidebar with navigation
- `AuditProgressStepper.tsx` - UI for multi-step audit progress
- `GenerateAuditPDF.tsx` - helper component to create audit PDFs
- `AnalysisSharingModal.jsx`, `ShareAnalysisModal.jsx` - sharing UI
- `AlertManagement.jsx` - alert creation/management UI
- `theme-toggle.jsx` - toggle for light/dark theme
- `svg-logo.tsx` - logo component
- `components/ui/*` - many UI primitive components (button, input, dialog, select, etc.) resembling shadcn patterns

Utils & hooks:

- `utils/supabase/client.js` - client-side Supabase helper
- `utils/supabase/server.js` - server-side Supabase helper for API routes and middleware
- `lib/utils.ts` - assorted utilities used across the app
- `lib/toast.ts` - toaster helper wrapper
- `hooks/useBackgroundAnalysis.js` - background worker for analysis tasks

API routes (`app/api`):

- `analysis/share/route.js` - share analysis endpoint
- `analyze/route.js` - server analyze API
- `analysis-results/route.js` - results retrieval route
- `report/route.js` - report generation route
- `notifications/route.js` - notifications creation/listing
- `auth/verify-otp/route.js` - OTP verification (used during auth flows)
- `users/route.js` - user profile operations (CRUD)

SQL migrations and seeds:

- `migrations/2025-10-09-create-analysis-notifications.sql` - migration to create notifications for analyses
- `profiles_migration.sql`, `sharing_migration.sql`, `saved_analyses_migration.sql`, `system_alerts_migration.sql`, etc.
- `sample_data_insertion.sql` and `sample_data_insertion_fixed.sql` - seed/sample data

## Pages & routes (user-facing)

High-level pages to document:

- `/sign-in` - login page
- `/sign-up` - registration
- `/dashboard` - main analytics & metrics dashboard (protected by middleware)
- `/dashboard/audits` - list of audits
- `/dashboard/audit-wizard` - multi-step wizard to create an audit
- `/dashboard/audit-fieldwork` - tasks and fieldwork UI
- `/dashboard/analysis` - analysis UI
- `/dashboard/analysis-results` - results viewer
- `/dashboard/reports` - reporting and saved reports
- `/dashboard/notifications` - system alerts / notifications
- `/profile`, `/settings` - user profile and settings (protected)

Note: The middleware config specifically matches `/dashboard/:path*`, `/profile/:path*`, `/settings/:path*` and will redirect to `/sign-in` when no Supabase session is present.

## API endpoints (serverless functions in Next)

Located under `app/api` (each folder contains a `route.js` implementing HTTP handlers):

- `POST /api/analyze` - starts an analysis job (looks up compute or queues a background task)
- `POST /api/analysis/share` - share an analysis with other users or teams
- `GET /api/analysis-results` - fetch analysis results
- `POST/GET /api/report` - generate or fetch reports
- `POST /api/notifications` - create notifications or fetch list
- `POST /api/auth/verify-otp` - verify OTP during sign-in
- `GET /api/users` - user listing/profile operations

Each of these handlers uses `utils/supabase/server.js` to authenticate requests via Supabase session and interact with DB.

## Database & migrations

The repo contains SQL migrations to set up the core schema. Notable tables (inferred from code and migrations):

- `profiles` - user profile extended data (id FK to auth.users)
- `audits` - audit meta-data: title, category, status, date, auditor, created_at
- `system_alerts` - alerts with severity, status, title, description, created_at
- `saved_analyses` - stored analyses with metadata and sharing
- `analysis_notifications` - notifications related to analyses (migration present)
- `sharing` - table mapping analysis/report shares to users or groups
- `notifications` - system or user notifications

There is a `setup_database.sql` for convenience; use that or the individual migration files to create schema in Supabase.

Important: migrations may assume specific Postgres extensions or Supabase auth schema (auth.users). Validate FK relations and triggers (e.g., updated_at triggers) before running in a production DB.

## Authentication & middleware

- Supabase is used for authentication. Client helper `utils/supabase/client.js` provides a pre-configured Supabase client for client-side calls.
- `middleware.js` is configured to read Supabase session cookies server-side using `@supabase/ssr` and to redirect unauthenticated requests from protected routes (/dashboard, /profile, /settings) to `/sign-in`.

The middleware uses:

- `createServerClient` from `@supabase/ssr`
- Next.js `NextResponse` to set cookies on server responses

Auth flow notes:

- The sign-in and sign-up pages live in `(login)` route segment. OTP verification is provided via `app/api/auth/verify-otp/route.js`.
- User profiles are stored in `profiles` table and linked to Supabase `auth.users(id)`.

## Client-side utilities and components

- `components/Sidebar.jsx` - main navigational sidebar used by dashboard layout
- `components/AnalysisSharingModal.jsx` & `ShareAnalysisModal.jsx` - modals for sharing analyses (UI and any client-side validation)
- `components/GenerateAuditPDF.tsx` - exports a function or component that produces downloadable PDFs using html2canvas/jspdf
- `hooks/useBackgroundAnalysis.js` - implements background polling or web-worker-style polling for analyze jobs
- `lib/toast.ts` + `components/ui/sonner.tsx` - wrapper around sonner toast notifications
- `lib/utils.ts` - miscellaneous helper functions (inspect this file for exact helpers)

## Styling, themes and UI system

- Tailwind CSS is configured (see `postcss.config.mjs` and `tailwind` in devDependencies). Several global CSS files are present:

  - `app/globals.css` - main global styles
  - `app/Dashboard.css` - dashboard-specific styling
  - `app/modern-dashboard.css` - alternate dashboard styles

- Theme switching is handled by `next-themes` and a `ThemeProvider` in `app/layout.js` with a `theme-toggle.jsx` component in `components`.

- UI primitives are in `components/ui` and follow shadcn-like patterns (Button, Dialog, Input, Select, Table, etc.). They are ready to compose throughout the app.

## Scripts and development commands

From `package.json`:

- `npm run dev` - start Next.js dev server
- `npm run build` - build production artifacts
- `npm run start` - start built server
- `npm run lint` - run Next.js linting (ESLint)

Install dependencies with:

```powershell
npm install
```

Run development server:

```powershell
npm run dev
```

On Windows, run in PowerShell as above. Environment variables (see below) must be set.

## Environment variables

Minimum env vars inferred from code:

- NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key used client-side
- NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY (possibly used server-side in some places) - service key if needed for server-only operations (not present by default)

Optional:

- NODE_ENV - development/production
- Any provider or API keys used by `@ai-sdk/react` or other AI providers referenced in `package.json` if those features are used (e.g., analyze API may call an LLM)

Make sure to set env vars in your local `.env.local` or in hosting provider (Vercel, Netlify) dashboards.

## Testing, linting, and build

- ESLint is configured; run `npm run lint` to lint the codebase.
- There are no unit tests provided in the repository (none detected). Consider adding tests (Jest/Playwright) for critical flows like authentication and API handlers.

Build steps:

- `npm run build` will run Next.js build. The project targets Next 15 which uses the app directory and server components.

Quality gates quick-check:

- Build: Not verified in this script; run locally. Watch for missing environment variables or Supabase tables referenced at runtime.
- Lint: Run `npm run lint` to verify ESLint rules.

## Deployment notes

- The project is compatible with Vercel (Next.js) and Netlify (plugin present in devDependencies). For Vercel, set the environment variables in the project settings. If using Netlify, the `@netlify/plugin-nextjs` is included.

- If you deploy to Vercel, enable server-side environment variables (for server-only keys) and take care with Supabase service-role keys—do not expose them to the client.

- The middleware depends on cookies and Supabase session cookies; make sure any hosting platform preserves cookies for server-side requests.

## Developer notes & next steps

- Consolidate naming: `config.js` references `Quillminds` while the project is named Kuldetek Auditing. Consider renaming for clarity.
- Add tests for API routes and critical components.
- Add CI workflow to run lint and build on PRs.
- Harden server-side admin functions (some admin tasks are currently implemented client-side only; server-side logic is recommended for security).
- Document database schema and sample data usage more explicitly in a `docs/` folder. Existing .md files (e.g., `DASHBOARD_SETUP.md`, `ANALYSIS_SHARING_SETUP.md`) are a good start.

## Appendix: Notable files and summaries

- `middleware.js` - protects dashboard/profile/settings routes using Supabase session.
- `app/layout.js` - sets up ThemeProvider, fonts, and Toaster.
- `app/page.js` - redirects root to `/sign-in`.
- `app/dashboard/page.jsx` - dashboard implementation with charts and metric cards. Uses `utils/supabase/client.js` and Recharts to render data.
- `utils/supabase/client.js` - returns client Supabase instance (used in client components).
- `utils/supabase/server.js` - server-side Supabase helper used in API routes and middleware.
- `components/GenerateAuditPDF.tsx` - PDF generation utilities (html2canvas, jspdf wrappers).
- `migrations/2025-10-09-create-analysis-notifications.sql` - migration for analysis notifications table.

---

If you'd like, I can now:

- Expand any specific section (for example, create a DB schema diagram, or document each API endpoint with request/response examples),
- Generate a smaller `README.md` that replaces the existing one, or
- Create developer checklists, CI configs, or sample `.env.local` templates.

Tell me which next step you'd like me to take.
