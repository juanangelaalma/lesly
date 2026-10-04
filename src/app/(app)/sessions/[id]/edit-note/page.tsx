import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { UpdateSessionNoteForm } from "@/features/sessions/forms";
import { getSessionDetail } from "@/features/scheduling/queries";

export const metadata: Metadata = { title: "Koreksi catatan sesi" };

export default async function EditSessionNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getSessionDetail(id);

  if (!result?.note || !result.topic || result.session.state !== "completed")
    notFound();

  return (
    <>
      <Link className="back-link" href={"/sessions/" + id}>
        <ArrowLeft aria-hidden="true" size={17} /> Kembali ke sesi
      </Link>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Riwayat koreksi</p>
          <h1>Ubah catatan</h1>
          <p className="page-description">
            Perubahan disimpan dengan alasan dan tidak mengubah tagihan.
          </p>
        </div>
      </div>
      <UpdateSessionNoteForm
        note={result.note}
        sessionId={id}
        topicName={result.topic.name}
      />
    </>
  );
}
