import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-3 px-5">
      <h1 className="font-display text-3xl font-bold">Data tidak ditemukan</h1>
      <p className="text-ink-muted">Halaman ini tidak ada atau bukan milik akun Anda.</p>
      <ButtonLink href="/today" variant="secondary">
        Ke beranda
      </ButtonLink>
    </main>
  );
}
