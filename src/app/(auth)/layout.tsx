export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span aria-hidden className="grid size-12 place-items-center rounded-[var(--radius-control)] border-2 border-ink bg-gold font-display text-2xl font-bold shadow-clay-bold">
          T
        </span>
        <div>
          <p className="font-display text-2xl leading-none font-bold">Teman Les</p>
          <p className="mt-1 text-sm text-ink-muted">Catatan les privat yang rapi, dari HP.</p>
        </div>
      </div>
      {children}
    </main>
  );
}
