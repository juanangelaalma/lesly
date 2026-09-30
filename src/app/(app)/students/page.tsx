import type { Metadata } from "next";
import Link from "next/link";
import { CaretRightIcon, MagnifyingGlassIcon, PlusIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { listStudents } from "@/features/students/queries";
import { currentPlan } from "@/features/students/current-plan";
import { BILLING_MODE_LABEL } from "@/features/billing/labels";
import { requireUser } from "@/lib/auth/require-user";
import { localDate } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";

export const metadata: Metadata = { title: "Murid" };

export default async function StudentsPage({ searchParams }: PageProps<"/students">) {
  const params = await searchParams;
  const status = params.status === "archived" ? "archived" : "active";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const tutor = await requireUser();
  const students = await listStudents(status, q);
  const today = localDate(new Date(), tutor.tz);

  return (
    <>
      <PageHeader
        title="Murid"
        subtitle={`${students.length} murid ${status === "active" ? "aktif" : "diarsipkan"}`}
        action={
          <ButtonLink href="/students/new" size="sm">
            <PlusIcon size={18} weight="bold" aria-hidden /> Tambah
          </ButtonLink>
        }
      />

      <form role="search" className="relative mb-3">
        <input type="hidden" name="status" value={status} />
        <label htmlFor="q" className="sr-only">Cari murid</label>
        <MagnifyingGlassIcon size={20} weight="bold" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        <Input id="q" name="q" type="search" defaultValue={q} placeholder="Cari nama murid" className="pl-11" />
      </form>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-[var(--radius-control)] border-2 border-line bg-surface-alt p-1" role="tablist">
        {(["active", "archived"] as const).map((value) => (
          <Link
            key={value}
            role="tab"
            aria-selected={status === value}
            href={value === "active" ? "/students" : "/students?status=archived"}
            className={cn(
              "flex min-h-10 items-center justify-center rounded-[var(--radius-inner)] font-label text-sm font-bold",
              status === value ? "border-2 border-ink bg-surface shadow-clay-bold-pressed" : "text-ink-muted",
            )}
          >
            {value === "active" ? "Aktif" : "Arsip"}
          </Link>
        ))}
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={<UsersThreeIcon size={36} weight="duotone" />}
          title={q ? "Tidak ada yang cocok" : status === "active" ? "Belum ada murid" : "Arsip kosong"}
          description={
            q
              ? "Coba kata kunci lain."
              : status === "active"
                ? "Tambahkan murid pertama beserta tarif dan kontak orang tuanya."
                : "Murid yang berhenti les akan muncul di sini."
          }
          action={status === "active" && !q ? <ButtonLink href="/students/new">Tambah murid</ButtonLink> : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {students.map((student) => {
            const plan = currentPlan(student.billing_plans, today);
            return (
              <li key={student.id}>
                <Link
                  href={`/students/${student.id}`}
                  className="pressable flex items-center gap-3 rounded-[var(--radius-card)] border-2 border-line bg-surface p-4 shadow-clay active:shadow-clay-pressed"
                >
                  <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-inner)] border-2 border-ink bg-purple-soft font-display text-lg font-bold">
                    {student.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-semibold">{student.name}</span>
                    <span className="block truncate text-sm text-ink-muted">
                      {[student.grade, student.subject].filter(Boolean).join(" · ") || "Belum ada kelas/mapel"}
                    </span>
                  </span>
                  {plan ? (
                    <span className="flex flex-col items-end gap-1">
                      <Badge tone={plan.mode === "monthly" ? "purple" : "gold"}>{BILLING_MODE_LABEL[plan.mode]}</Badge>
                      <span className="tabular text-sm font-semibold">{formatRupiah(plan.amount)}</span>
                    </span>
                  ) : null}
                  <CaretRightIcon size={18} weight="bold" className="shrink-0 text-ink-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
