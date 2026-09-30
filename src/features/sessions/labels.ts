import type { BadgeTone } from "@/components/ui/badge";
import type { Enums } from "@/types/database";

export const SESSION_STATUS: Record<Enums<"session_status">, { label: string; tone: BadgeTone }> = {
  scheduled: { label: "Terjadwal", tone: "purple" },
  completed: { label: "Selesai", tone: "teal" },
  student_absent: { label: "Murid izin", tone: "gold" },
  teacher_cancelled: { label: "Dibatalkan guru", tone: "neutral" },
};

export const UNDERSTANDING_TONE: Record<Enums<"understanding_level">, BadgeTone> = {
  independent: "teal",
  assisted: "gold",
  repeat: "coral",
};
