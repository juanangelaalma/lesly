# Teman Les

Mobile-first workspace for independent tutors to organize students, session notes, and billing. The initial slice provides invited-user authentication, teacher onboarding, and owner-isolated student and rate setup.

## Local setup

1. Use Node.js 20.9 or newer and npm.
2. Copy `.env.example` to `.env.local`; fill in the Supabase project URL and publishable key, and set `APP_URL` to the local app origin.
3. Apply the SQL files in `supabase/migrations` to a Supabase project.
4. Invite pilot teachers through Supabase Auth. Public signup is not included.
5. Run `npm install`, then `npm run dev`.

`npm run check` runs Oxlint, TypeScript, and the production build. No sample student or parent data is seeded.

## Current slice

- Email/password login, logout, reset password, and invited-user confirmation.
- Teacher profile and Indonesia timezone onboarding.
- Student create, edit, archive, WhatsApp number normalization, and a versioned billing plan.
- Row Level Security for every domain table, with database mutations restricted to ownership-checking RPCs.

Schedule materialization, session notes, invoicing, and payment recording remain subsequent vertical slices in the delivery plan in `PRD-dan-Teknis.md`.
