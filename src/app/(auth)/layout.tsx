import "@/components/layout/app-shell.css";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="auth-shell mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10 sm:max-w-lg sm:px-8">
      <div className="mb-8 flex items-center gap-3">
        <span aria-hidden className="grid size-12 place-items-center rounded-[var(--radius-control)] border-2 border-ink bg-gold font-display text-2xl font-bold shadow-clay-bold">
          T
        </span>
        <div>
          <p className="font-display text-2xl leading-none font-bold">Teman Les</p>
          <p className="mt-1 text-sm text-ink-muted">Catatan les privat yang rapi, dari HP.</p>
        </div>
      </div>
      <section className="rounded-[var(--radius-card)] border-2 border-line bg-surface p-5 shadow-clay sm:p-7">
        {children}
      </section>
    </main>
  );
}
