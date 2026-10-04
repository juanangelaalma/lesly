'use client';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="content"><section className="panel panel-pad empty-state"><h1>Halaman belum bisa dimuat</h1><p>Data tidak diubah. Coba muat ulang bagian ini.</p><button className="button button-primary" onClick={reset}>Coba lagi</button></section></main>;
}
