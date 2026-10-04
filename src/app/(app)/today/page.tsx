import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarDays,
  Plus,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { getStudentCount } from "@/features/students/queries";
import { formatLocalDate, jakartaDateInputValue } from "@/lib/format";

export const metadata: Metadata = { title: "Hari ini" };

export default async function TodayPage() {
  const studentCount = await getStudentCount();
  const today = formatLocalDate(jakartaDateInputValue(), { weekday: "long" });

  return (
    <>
      <div className="page-topline">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>Hari ini</h1>
          <p className="page-description">
            Semua kegiatan lesmu akan tertata di satu tempat.
          </p>
        </div>
      </div>

      <section className="hero-card" aria-labelledby="today-hero-title">
        <p className="eyebrow">Ruang kerjamu</p>
        <h2 id="today-hero-title">
          Mengajar lebih tenang, mencatat lebih rapi.
        </h2>
        <p>
          Mulai dengan menyimpan data murid dan pola tarifnya. Jadwal, catatan
          pertemuan, serta tagihan akan mengikuti alur belajarmu.
        </p>
        <Link
          className="button"
          href={studentCount === 0 ? "/students/new" : "/students"}
        >
          {studentCount === 0 ? (
            <Plus aria-hidden="true" size={18} />
          ) : (
            <ArrowRight aria-hidden="true" size={18} />
          )}
          {studentCount === 0 ? "Tambah murid pertama" : "Lihat daftar murid"}
        </Link>
      </section>

      <div className="stats-grid stats-grid-single">
        <section className="card stat-card" aria-label="Jumlah murid aktif">
          <p className="stat-label">
            <UsersRound aria-hidden="true" size={16} /> Murid aktif
          </p>
          <p className="stat-value">{studentCount}</p>
          <p className="stat-note">Data murid yang sedang belajar</p>
        </section>
        <section
          className="card stat-card stat-card-upcoming"
          aria-label="Agenda hari ini"
        >
          <p className="stat-label">
            <CalendarDays aria-hidden="true" size={16} /> Agenda hari ini
          </p>
          <p className="stat-value stat-value-word">Siap ditata</p>
          <p className="stat-note">
            <Sparkles aria-hidden="true" size={14} /> Jadwal mingguan menjadi
            langkah berikutnya
          </p>
        </section>
      </div>

      <div className="section-heading">
        <h2>Langkah berikutnya</h2>
      </div>
      <section className="card card-pad next-step-card">
        <div className="next-step-icon">
          <CalendarDays aria-hidden="true" size={21} />
        </div>
        <div>
          <h3>Atur jadwal belajar</h3>
          <p>
            Tambahkan jadwal rutin atau sesi satu kali, lalu catat hasil belajar
            setelah mengajar.
          </p>
        </div>
        <span className="badge next-step-badge">Segera hadir</span>
      </section>
    </>
  );
}
