import { Field, Input, Select } from "@/components/ui/field";
import { weekdayName } from "@/lib/dates";

export function RuleFields({ studentId, today }: { studentId: string; today: string }) {
  return (
    <>
      <input type="hidden" name="studentId" value={studentId} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hari" htmlFor="weekday">
          <Select id="weekday" name="weekday" defaultValue="1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <option key={day} value={day}>
                {weekdayName(day)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Jam mulai" htmlFor="startTime">
          <Input id="startTime" name="startTime" type="time" defaultValue="16:00" required />
        </Field>
        <Field label="Durasi (menit)" htmlFor="duration">
          <Input id="duration" name="duration" type="number" inputMode="numeric" min={15} max={480} step={15} defaultValue={90} required />
        </Field>
        <Field label="Mulai tanggal" htmlFor="activeFrom">
          <Input id="activeFrom" name="activeFrom" type="date" defaultValue={today} required />
        </Field>
      </div>
    </>
  );
}
