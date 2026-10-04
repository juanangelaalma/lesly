import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { StudentForm } from "@/features/students/student-form";

export const metadata: Metadata = { title: "Tambah murid" };

export default function NewStudentPage() {
  return (
    <>
      <Link className="back-link" href="/students">
        <ArrowLeft aria-hidden="true" size={17} /> Kembali ke murid
      </Link>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Data baru</p>
          <h1>Tambah murid</h1>
          <p className="page-description">
            Isi informasi yang kamu perlukan untuk menyiapkan kegiatan belajar.
          </p>
        </div>
      </div>
      <StudentForm requestKey={randomUUID()} />
    </>
  );
}
