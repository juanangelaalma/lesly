# Teman Les (Lesly)

Aplikasi web mobile-first untuk tutor privat: jadwal, catatan sesi, laporan ke orang tua via WhatsApp, dan tagihan. Spesifikasi produk ada di `PRD-dan-Teknis.md`, sistem desain di `DESIGN.md`.

## Stack

Next.js 16 (App Router, Server Actions, `proxy.ts`), React 19, TypeScript, Tailwind CSS v4, Supabase (Auth, Postgres + RLS, RPC `security definer`), Zod, Vitest, pgTAP.

## Menjalankan secara lokal

Butuh Node 22+ dan Docker.

```bash
npm install
npx supabase start          # Postgres, Auth, Mailpit lokal
cp .env.example .env.local  # isi dari `npx supabase status`
npm run dev
```

Seed lokal (`supabase/seed.sql`) membuat akun demo `demo@temanles.test` / `demo12345` dengan dua murid, jadwal rutin, satu sesi selesai, dan tagihan bulan berjalan. Email konfirmasi dan reset kata sandi lokal dapat dilihat di Mailpit (`http://127.0.0.1:54324`).

## Skrip

| Perintah | Fungsi |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate tipe route Next lalu `tsc --noEmit` |
| `npm test` | Unit test (Vitest) |
| `npm run build` | Build produksi |
| `npm run db:reset` | Terapkan ulang migrasi + seed |
| `npm run db:test` | Test database pgTAP (billing, idempotensi, isolasi tenant) |
| `npm run db:types` | Regenerate `src/types/database.ts` |

## Arsitektur singkat

- `supabase/migrations/*_schema.sql`: tabel ber-`owner_id`, FK komposit sadar-pemilik, RLS di semua tabel, view `invoice_balances` (security invoker).
- `supabase/migrations/*_rpc.sql`: semua mutasi domain lewat RPC `security definer` dengan `search_path = ''`, cek `auth.uid()`, idempotensi (`mutation_requests`), dan versi optimistis. Tulis langsung dari role `authenticated` dicabut.
- `src/features/*`: per domain (auth, students, scheduling, sessions, reports, billing, audit) berisi schema Zod, server actions, query, dan komponen.
- `src/app/(app)`: rute tutor (`/today`, `/schedule`, `/students`, `/sessions`, `/invoices`, `/settings`); `src/app/(auth)`: login, daftar, reset kata sandi; `/api/exports/[kind]`: ekspor CSV.

## Deploy

Buat project Supabase, jalankan `npx supabase db push`, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, dan `APP_URL` di hosting (mis. Vercel), lalu tambahkan `${APP_URL}/auth/confirm` ke Redirect URLs Supabase Auth.
