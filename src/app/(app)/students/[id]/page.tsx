import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Edit3,
  MessageCircle,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveStudentForm } from "@/features/students/archive-student-form";
import { getStudent } from "@/features/students/queries";
import {
  formatLocalDate,
  formatRupiah,
  getCurrentBillingPlan,
} from "@/lib/format";

export const metadata: Metadata = { title: "Detail murid" };

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getStudent(id);

  if (!result) notFound();

  const { student, plans } = result;
  const currentPlan = getCurrentBillingPlan(plans);

  const billingMode =
    currentPlan?.mode === "per_session" ? "Per sesi selesai" : "Bulanan";

  return (
    <>
      <Link className="back-link" href="/students">
        <ArrowLeft aria-hidden="true" size={17} /> Kembali ke murid
      </Link>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Detail murid</p>
          <h1>{student.name}</h1>
          <p className="page-description">
            {student.grade || "Kelas belum diisi"}
          </p>
        </div>
        {!student.archived_at && (
          <Link
            className="button button-secondary"
            href={`/students/${student.id}/edit`}
          >
            <Edit3 aria-hidden="true" size={17} /> Ubah data
          </Link>
        )}
      </div>

      {student.archived_at && (
        <p className="archive-banner">
          Murid ini diarsipkan. Data lama tetap tersimpan.
        </p>
      )}

      <div className="detail-grid">
        <section
          className="card card-pad"
          aria-labelledby="profile-section-title"
        >
          <h2 id="profile-section-title">Informasi murid</h2>
          <dl className="detail-list">
            <div className="detail-line">
              <dt>Nama</dt>
              <dd>{student.name}</dd>
            </div>
            <div className="detail-line">
              <dt>Kelas</dt>
              <dd>{student.grade || "Belum diisi"}</dd>
            </div>
            <div className="detail-line">
              <dt>Orang tua</dt>
              <dd>{student.guardian_name || "Belum diisi"}</dd>
            </div>
            <div className="detail-line">
              <dt>WhatsApp</dt>
              <dd>{student.guardian_phone_e164 || "Belum diisi"}</dd>
            </div>
            <div className="detail-line">
              <dt>Patokan lokasi</dt>
              <dd>{student.address_hint || "Belum diisi"}</dd>
            </div>
            <div className="detail-line">
              <dt>Mulai belajar</dt>
              <dd>{formatLocalDate(student.starts_on)}</dd>
            </div>
          </dl>
        </section>

        <section
          className="card card-pad"
          aria-labelledby="billing-section-title"
        >
          <h2 id="billing-section-title">Tarif</h2>
          {currentPlan ? (
            <dl className="detail-list">
              <div className="detail-line">
                <dt>Model</dt>
                <dd>{billingMode}</dd>
              </div>
              <div className="detail-line">
                <dt>Nominal</dt>
                <dd>{formatRupiah(currentPlan.rate_rupiah)}</dd>
              </div>
              <div className="detail-line">
                <dt>Jatuh tempo</dt>
                <dd>Tanggal {currentPlan.due_day}</dd>
              </div>
              <div className="detail-line">
                <dt>Berlaku mulai</dt>
                <dd>
                  {formatLocalDate(currentPlan.effective_month, {
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="muted-copy">Informasi tarif belum tersedia.</p>
          )}
        </section>
      </div>

      <div className="section-heading">
        <h2>Tarif sebelumnya</h2>
      </div>
      {plans.some((plan) => plan.id !== currentPlan?.id) ? (
        <section className="card card-pad" aria-label="Riwayat tarif">
          <dl className="detail-list">
            {plans.map((plan) =>
              plan.id === currentPlan?.id ? null : (
                <div className="detail-line" key={plan.id}>
                  <dt>
                    {formatLocalDate(plan.effective_month, {
                      month: "long",
                      year: "numeric",
                    })}
                  </dt>
                  <dd>
                    {formatRupiah(plan.rate_rupiah)} ·{" "}
                    {plan.mode === "monthly" ? "Bulanan" : "Per sesi"}
                  </dd>
                </div>
              ),
            )}
          </dl>
        </section>
      ) : (
        <p className="muted-copy">Belum ada perubahan tarif sebelumnya.</p>
      )}

      <div className="section-heading">
        <h2>Yang bisa kamu lakukan</h2>
      </div>
      <div className="quick-actions">
        <Link className="card quick-action" href="/today">
          <CalendarDays aria-hidden="true" size={19} />
          <span>Agenda belajar</span>
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
        <Link className="card quick-action" href="/invoices">
          <WalletCards aria-hidden="true" size={19} />
          <span>Tagihan</span>
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
        <span className="card quick-action is-unavailable">
          <MessageCircle aria-hidden="true" size={19} />
          <span>Bagikan laporan</span>
          <span className="soon-label">Setelah sesi dicatat</span>
        </span>
      </div>

      {!student.archived_at && (
        <div className="section-heading">
          <h2>Pengelolaan</h2>
        </div>
      )}
      {!student.archived_at && <ArchiveStudentForm studentId={student.id} />}
    </>
  );
}
