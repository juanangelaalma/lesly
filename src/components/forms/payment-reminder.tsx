'use client';

import { useState } from 'react';
import { formatRupiah } from '@/lib/money';

export default function PaymentReminder({ studentName, guardianName, phone, period, total, paid, balance }: { studentName: string; guardianName: string | null; phone: string | null; period: string; total: number; paid: number; balance: number }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const text = `Halo${guardianName ? ` ${guardianName}` : ''}, izin mengingatkan pembayaran les ${studentName} untuk ${period}. Total ${formatRupiah(total)}, sudah diterima ${formatRupiah(paid)}, sisa ${formatRupiah(balance)}. Jika sudah transfer, boleh kabari saya agar saya cek dan catat. Terima kasih.`;
  const digits = (phone || '').replace(/\D/g, '');
  const link = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  async function copyReminder() {
    setError('');
    try { await navigator.clipboard.writeText(text); setCopied(true); }
    catch { setError('Teks belum tersalin. Pilih dan salin pengingat secara manual.'); }
  }
  return <section className="agenda panel panel-pad"><div className="section-head"><h2>Pratinjau pengingat</h2></div><div style={{ borderRadius: 12, background: 'var(--canvas)', padding: 18, lineHeight: 1.8 }}>{text}</div><p className="helper" style={{ marginTop: 14 }}>{phone ? `Penerima: ${guardianName || studentName}. Periksa nomor di WhatsApp sebelum mengirim.` : 'Nomor orang tua belum dicatat. Pilih penerima di WhatsApp atau salin teks.'} Aplikasi tidak mengetahui apakah pesan sudah terkirim.</p><div className="form-actions"><button className="button" type="button" onClick={copyReminder}>{copied ? 'Teks tersalin' : 'Salin teks'}</button><a className="button button-primary" href={link} target="_blank" rel="noreferrer">Buka WhatsApp</a></div>{error && <p className="notice" role="alert">{error}</p>}</section>;
}
