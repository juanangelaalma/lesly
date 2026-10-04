import type { Metadata } from "next";
import { CircleDollarSign, ReceiptText } from "lucide-react";

export const metadata: Metadata = { title: "Tagihan" };

export default function InvoicesPage() {
  return (
    <>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Pembayaran</p>
          <h1>Tagihan</h1>
          <p className="page-description">
            Catatan pembayaran terpisah dari catatan belajar.
          </p>
        </div>
      </div>
      <section
        className="card empty-state"
        aria-labelledby="invoice-empty-title"
      >
        <span className="empty-icon">
          <ReceiptText aria-hidden="true" size={27} />
        </span>
        <h2 id="invoice-empty-title">Belum ada tagihan untuk ditampilkan</h2>
        <p>
          Ringkasan tagihan akan muncul di sini. Menyelesaikan sesi dan menerima
          pembayaran akan menjadi dua langkah yang terpisah.
        </p>
        <div className="callout invoice-note">
          <CircleDollarSign aria-hidden="true" size={18} />
          <span>
            Tidak ada tagihan yang dibuat sebelum data sesi dan model tarif
            tersedia.
          </span>
        </div>
      </section>
    </>
  );
}
