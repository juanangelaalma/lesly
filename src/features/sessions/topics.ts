import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function recentTopics(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learning_topics")
    .select("name")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data.map((t) => t.name);
}
