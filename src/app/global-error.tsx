"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui", padding: 24, background: "#fff8f0", color: "#2d3047" }}>
        <h1>Terjadi kesalahan</h1>
        <p>Coba muat ulang halaman.</p>
        <button type="button" onClick={() => reset()}>
          Coba lagi
        </button>
      </body>
    </html>
  );
}
