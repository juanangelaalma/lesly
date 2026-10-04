import { BookOpenCheck } from "lucide-react";

export function Brand({ centered = false }: { centered?: boolean }) {
  const className = centered ? "brand-lockup auth-brand" : "brand-lockup";

  return (
    <div className={className} aria-label="Teman Les">
      <span className="brand-mark" aria-hidden="true">
        <BookOpenCheck size={21} strokeWidth={2} />
      </span>
      <span>
        <span className="brand-name">Teman Les</span>
        <span className="brand-caption">Ruang kerja guru</span>
      </span>
    </div>
  );
}
