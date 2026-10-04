# Teman Les

Aplikasi mobile-first untuk guru les mandiri, dengan jadwal sesi, catatan belajar, laporan yang dapat ditinjau sebelum dibagikan, serta pencatatan tagihan dan pembayaran.

## Menjalankan lokal

1. Gunakan Node.js 20 atau lebih baru.
2. Salin `.env.example` menjadi `.env.local`, lalu isi URL Supabase dan publishable key dari project Supabase.
3. Terapkan migrasi SQL melalui Supabase CLI atau SQL editor project dev: `supabase/migrations/202610050001_initial_schema.sql`.
4. Pastikan redirect URL Supabase mencakup `http://localhost:3000/auth/confirm` dan aktifkan email/password pada Auth.
5. Jalankan `npm install`, lalu `npm run dev`.

Semua halaman guru memerlukan sesi Supabase yang valid. Tidak ada mode demo atau data anak contoh. Form mutasi memanggil RPC terotorisasi; database RLS membatasi pembacaan berdasarkan pemilik. Rahasia service role tidak digunakan oleh aplikasi.

## Catatan, foto, dan privasi

- Kemajuan materi merangkum status pemahaman guru dari maksimal 20 sesi terbaru; aplikasi tidak menilai murid secara otomatis.
- Ringkasan tagihan menghitung pembayaran dari tanggal diterima pada bulan lokal dan sisa invoice periode berjalan.
- Foto latihan hanya tersedia setelah sesi selesai dan izin orang tua beserta tanggalnya dicatat. Maksimal satu foto privat per sesi; berkas JPEG/PNG/WebP dibatasi 5 MiB, didekode lalu dikompresi ulang ke JPEG dengan sisi terpanjang maksimal 1600 px agar metadata EXIF/GPS tidak ikut tersimpan. Foto tidak masuk ke pesan WhatsApp; unduhan memerlukan sesi guru yang berwenang.
- Menarik izin memblokir unggahan baru dan menghapus foto terkait. Jika penghapusan Storage sementara gagal, foto langsung disembunyikan dan pembersihan dapat dicoba ulang dari detail sesi.
- Bucket `session-photos` dan tabel izin/media dibuat oleh migrasi. Untuk Supabase lokal, jalankan `npx supabase start` lalu `npx supabase db reset`.

## Perintah

- `npm run dev`: server pengembangan.
- `npm run lint`: ESLint.
- `npm run typecheck`: pemeriksaan TypeScript.
- `npm run build`: build Next.js.
- `npm run test:e2e`: pengujian Playwright.

## Arah desain

Design Read: ruang kerja guru mobile-first untuk guru les mandiri, memakai permukaan hangat dan aksen hijau yang tenang dari PRD, dengan kedalaman tepi-bayangan keras serta kontrol yang terasa ditekan dari bahasa Clay di `DESIGN.md`. Dials: ENERGY 2 / RHYTHM 2 / MOTION 1. Kanvas #F7F8F3, permukaan putih, teks #203831, aksen #285C44; warna aksen dari PRD menjaga keterbacaan pada UI berbahasa Indonesia, sementara kontrol press dan radius berjenjang mengadaptasi karakter clay tanpa membawa identitas Aura Coach ke produk ini. Tipografi memakai sans sistem agar input dan label terbaca jelas pada perangkat guru.
