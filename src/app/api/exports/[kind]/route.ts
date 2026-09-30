import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

const KINDS = ["students", "sessions", "invoices", "payments"] as const;
type Kind = (typeof KINDS)[number];

function isKind(value: string): value is Kind {
  return (KINDS as readonly string[]).includes(value);
}

async function buildCsv(kind: Kind): Promise<string> {
  const supabase = await createClient();
  switch (kind) {
    case "students": {
      const { data, error } = await supabase
        .from("students")
        .select("name, grade, subject, address, guardian_name, guardian_phone, status, created_at")
        .order("name");
      if (error) throw error;
      return toCsv(
        ["nama", "kelas", "mapel", "alamat", "wali", "whatsapp", "status", "dibuat"],
        data.map((r) => [r.name, r.grade, r.subject, r.address, r.guardian_name, r.guardian_phone, r.status, r.created_at]),
      );
    }
    case "sessions": {
      const { data, error } = await supabase
        .from("sessions")
        .select("starts_at, duration_minutes, status, status_reason, students(name), session_notes(understanding, note, learning_topics(name))")
        .order("starts_at");
      if (error) throw error;
      return toCsv(
        ["murid", "mulai", "durasi_menit", "status", "alasan", "materi", "pemahaman", "catatan"],
        data.map((r) => [
          r.students?.name,
          r.starts_at,
          r.duration_minutes,
          r.status,
          r.status_reason,
          r.session_notes?.learning_topics?.name,
          r.session_notes?.understanding,
          r.session_notes?.note,
        ]),
      );
    }
    case "invoices": {
      const [{ data, error }, { data: students, error: sErr }] = await Promise.all([
        supabase.from("invoice_balances").select("student_id, period, total, paid, balance, status").order("period"),
        supabase.from("students").select("id, name"),
      ]);
      if (error) throw error;
      if (sErr) throw sErr;
      const names = new Map(students.map((s) => [s.id, s.name]));
      return toCsv(
        ["murid", "periode", "total", "dibayar", "sisa", "status"],
        data.map((r) => [r.student_id ? names.get(r.student_id) : "", r.period, r.total, r.paid, r.balance, r.status]),
      );
    }
    case "payments": {
      const { data, error } = await supabase
        .from("payments")
        .select("amount, paid_on, method, note, status, void_reason, invoices(period, students(name))")
        .order("paid_on");
      if (error) throw error;
      return toCsv(
        ["murid", "periode", "nominal", "tanggal", "metode", "catatan", "status", "alasan_batal"],
        data.map((r) => [r.invoices?.students?.name, r.invoices?.period, r.amount, r.paid_on, r.method, r.note, r.status, r.void_reason]),
      );
    }
  }
}

export async function GET(_request: NextRequest, { params }: RouteContext<"/api/exports/[kind]">) {
  const { kind } = await params;
  if (!isKind(kind)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const csv = await buildCsv(kind);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="temanles-${kind}-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
