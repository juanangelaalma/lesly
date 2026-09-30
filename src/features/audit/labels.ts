export const AUDIT_ACTION_LABEL: Record<string, string> = {
  create: "Dibuat",
  update: "Diubah",
  reschedule: "Dipindah jadwal",
  complete: "Diselesaikan",
  reopen: "Dibuka ulang",
  student_absent: "Ditandai murid izin",
  teacher_cancelled: "Ditandai dibatalkan guru",
  void: "Dibatalkan",
  archived: "Diarsipkan",
  active: "Diaktifkan kembali",
  end: "Dihentikan",
};

export function auditLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}
