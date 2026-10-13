# Landing page Teman Les

Landing page mandiri, hanya **HTML + CSS**, tanpa build, JavaScript, atau perubahan pada aplikasi Next.js.

## Membuka halaman

Buka `index.html` langsung di browser, atau dari root repository:

```sh
npx --yes serve landing-page -l 4173
```

Kunjungi `http://localhost:4173`.

## Isi folder

- `index.html` — konten Bahasa Indonesia, contoh UI produk, fitur, alur, FAQ native `<details>`, dan CTA.
- `styles.css` — token Clay, layout responsif, focus keyboard, dan reduced motion.

## Menghubungkan dengan aplikasi

Tautan **Masuk** dan **Buat akun guru** menggunakan aplikasi lokal di `http://localhost:3000/login` dan `http://localhost:3000/register`. Jalankan aplikasi utama secara terpisah. Sebelum deployment, ganti semua `http://localhost:3000` di `index.html` dengan origin aplikasi produksi. Jika landing page dan aplikasi memakai origin yang sama, gunakan `/login` dan `/register`.

Folder ini tidak otomatis menjadi route Next.js. Deploy isinya pada hosting statis atau hubungkan ke aplikasi dalam pekerjaan terpisah. Pastikan registrasi memang dibuka sebelum mempublikasikan CTA pendaftaran; PRD memperbolehkan pilot berbasis undangan.

## Acuan & batas klaim

- Produk: `../PRD-dan-Teknis.md`.
- Visual: `../DESIGN.md`; identitas Teman Les, bukan Aura Coach.
- Gaya: Fredoka untuk judul, Nunito untuk label, Inter untuk body; krem, pastel, dark ink, dan sharp press-down shadow.
- Contoh nama, jadwal, catatan, dan nominal adalah data ilustrasi, bukan data pengguna nyata.
- Gratis hanya selama pilot; tidak ada testimonial atau klaim peningkatan nilai.
- WhatsApp dikirim manual oleh guru. Pembayaran hanya dicatat, bukan diproses.
- Google Fonts membutuhkan internet. Bila tidak tersedia, halaman memakai font fallback. Self-host font jika diperlukan untuk deployment tanpa dependency eksternal.

## Pemeriksaan

Keunikan ID, target anchor (termasuk simbol SVG), keberadaan stylesheet, dan keseimbangan kurung CSS diperiksa secara statis. Screenshot desktop/mobile belum dapat diverifikasi di lingkungan pengerjaan karena Chromium tidak bisa dimulai (library `libglib-2.0.so.0` tidak tersedia). Periksa di browser pada 320, 390, 768, dan 1440px sebelum publikasi, termasuk focus keyboard, buka/tutup FAQ, dan tautan aplikasi.
