import Link from 'next/link';
import StudentForm from '@/components/forms/student-form';

export default function NewStudentPage() {
  return <>
    <header className="topline"><div><p className="eyebrow"><Link href="/students">Murid</Link> / Murid baru</p><h1>Tambah murid</h1><p className="lede">Mulai dari data yang membantu kamu menyiapkan sesi dan tagihan.</p></div></header>
    <section className="panel panel-pad"><StudentForm /></section>
  </>;
}
