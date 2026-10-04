import type { Metadata } from "next";
import { ArrowRight, Plus, UserRoundPlus, UsersRound } from "lucide-react";
import Link from "next/link";

import { getStudents } from "@/features/students/queries";

export const metadata: Metadata = { title: "Murid" };

export default async function StudentsPage() {
  const students = await getStudents();

  return (
    <>
      <div className="page-topline">
        <div>
          <p className="eyebrow">Daftar belajar</p>
          <h1>Murid</h1>
          <p className="page-description">
            Data kontak dan tarif setiap muridmu.
          </p>
        </div>
        <Link className="button" href="/students/new">
          <Plus aria-hidden="true" size={18} /> Tambah murid
        </Link>
      </div>

      {students.length === 0 ? (
        <section
          className="card empty-state"
          aria-labelledby="students-empty-title"
        >
          <span className="empty-icon">
            <UserRoundPlus aria-hidden="true" size={28} />
          </span>
          <h2 id="students-empty-title">Belum ada murid di daftar</h2>
          <p>
            Simpan nama, kelas, kontak orang tua, dan tarif supaya catatan
            belajarmu mudah ditemukan nanti.
          </p>
          <Link className="button" href="/students/new">
            <Plus aria-hidden="true" size={18} /> Tambah murid
          </Link>
        </section>
      ) : (
        <section className="student-list" aria-label="Murid aktif">
          {students.map((student) => (
            <Link
              className="student-row"
              href={`/students/${student.id}`}
              key={student.id}
            >
              <span className="student-initial" aria-hidden="true">
                {student.name.trim().slice(0, 1).toLocaleUpperCase("id-ID")}
              </span>
              <span className="student-row-copy">
                <h3>{student.name}</h3>
                <p>{student.grade || "Kelas belum diisi"}</p>
              </span>
              <span className="student-row-meta">
                <span className="badge">Aktif</span>
                <ArrowRight aria-hidden="true" size={18} />
              </span>
            </Link>
          ))}
        </section>
      )}

      <div className="students-footer-note">
        <UsersRound aria-hidden="true" size={16} />
        <span>{students.length} murid aktif</span>
      </div>
    </>
  );
}
