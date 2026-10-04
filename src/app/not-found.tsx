import Link from 'next/link';

export default function NotFound() {
  return <main className="content" style={{ padding: '15vh 20px' }}><section className="panel panel-pad empty-state"><h1>Halaman tidak ditemukan</h1><p>Tautan ini mungkin sudah tidak berlaku.</p><Link className="button button-primary" href="/today">Kembali ke hari ini</Link></section></main>;
}
