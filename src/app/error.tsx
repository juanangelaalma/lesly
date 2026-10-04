"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="auth-page">
      <section className="card auth-card" aria-labelledby="error-title">
        <p className="eyebrow">Ada kendala</p>
        <h1 id="error-title">Halaman belum dapat dimuat</h1>
        <p>
          Coba muat ulang. Data yang belum berhasil disimpan tetap perlu dikirim
          kembali.
        </p>
        <button className="button" onClick={reset} type="button">
          Coba lagi
        </button>
      </section>
    </main>
  );
}
