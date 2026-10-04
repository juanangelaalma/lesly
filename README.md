# Teman Les

Mobile-first workspace for independent tutors to organize students, session notes, schedules, and billing. The P0 slice covers invited-user access through session reporting and payment tracking.

## Local setup

1. Use Node.js 20.9 or newer and npm.
2. Copy `.env.example` to `.env.local`; fill in the Supabase project URL and publishable key, and set `APP_URL` to the local app origin.
3. Apply the SQL files in `supabase/migrations` to a Supabase project.
4. Invite pilot teachers through Supabase Auth. Public signup is not included.
5. Run `npm install`, then `npm run dev`.

`npm run check` runs formatting, Oxlint, TypeScript, unit tests, and the production build. No sample student or parent data is seeded.

## P0 workflows

- Email/password login, logout, reset password, and invited-user confirmation.
- Teacher profile and Indonesia timezone onboarding.
- Student create, edit, archive, WhatsApp number normalization, and effective-dated billing plans.
- Weekly schedules, one-off sessions, agenda materialization, rescheduling, absence, and teacher cancellation.
- Session completion, short learning notes, revision history, and student learning history.
- Monthly and per-session invoices, partial payments, payment reversals, and reasoned invoice adjustments.
- Report and payment-reminder previews with manual copy and WhatsApp handoff.
- Row Level Security for domain tables, with writes restricted to ownership-checking database RPCs.

Optional session photos, comparative topic progress, monthly income summaries, and CSV export are P1 work described in `PRD-dan-Teknis.md`.
