"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border-2 border-coral bg-coral-soft p-5">
      <h1 className="font-display text-xl font-bold">Halaman gagal dimuat</h1>
      <p className="text-sm">Periksa koneksi internet lalu coba lagi. Data yang sudah tersimpan tetap aman.</p>
      <Button variant="secondary" onClick={() => reset()}>
        Coba lagi
      </Button>
    </div>
  );
}
