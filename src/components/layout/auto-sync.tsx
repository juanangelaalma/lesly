"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Runs an idempotent server mutation once after mount (e.g. materializing the
 * schedule window or monthly invoices) and refreshes the page if it changed data.
 */
export function AutoSync({ action, label }: { action: () => Promise<boolean>; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    startTransition(async () => {
      const changed = await action();
      if (changed) router.refresh();
    });
  }, [action, router]);

  if (!pending) return null;
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
      <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      {label}
    </p>
  );
}
