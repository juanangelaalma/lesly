import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="card auth-card" aria-labelledby="not-found-title">
        <p className="eyebrow">404 · Tidak ditemukan</p>
        <h1 id="not-found-title">Halaman ini tidak ada</h1>
        <p>Periksa kembali alamatnya, atau kembali ke beranda Teman Les.</p>
        <Link className="button" href="/today">
          Kembali ke Hari ini
        </Link>
      </section>
    </main>
  );
}
