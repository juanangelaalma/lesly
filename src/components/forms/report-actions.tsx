'use client';

import { useState } from 'react';

export default function ReportActions({ text, whatsappUrl }: { text: string; whatsappUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  async function copyReport() {
    setError('');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError('Teks belum tersalin. Pilih dan salin teks laporan secara manual.');
    }
  }
  return <div className="form-actions" style={{ flexWrap: 'wrap' }}><button className="button" type="button" onClick={copyReport}>{copied ? 'Teks tersalin' : 'Salin teks'}</button><a className="button button-primary" href={whatsappUrl} target="_blank" rel="noreferrer">Buka WhatsApp</a>{error && <p className="notice" role="alert">{error}</p>}</div>;
}
