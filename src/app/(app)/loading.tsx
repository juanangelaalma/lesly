export default function Loading() {
  return (
    <div role="status" aria-label="Memuat" className="flex flex-col gap-3 pt-2">
      <div className="h-8 w-2/3 animate-pulse rounded-[var(--radius-inner)] bg-surface-alt" />
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface-alt" />
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface-alt" />
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface-alt" />
    </div>
  );
}
