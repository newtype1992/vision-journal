import { supabase } from "../../lib/supabaseClient";
import { Habit, HabitLog, HabitType } from "../../types/domain";

export async function listActiveHabits() {
  const { data, error } = await supabase
    .from("habits")
    .select("id, name, type, unit, is_archived, created_at, updated_at")
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  return { data: (data as Habit[] | null) ?? null, error };
}

export async function fetchActiveHabits() {
  return listActiveHabits();
}

export async function listHabitsByIds(habitIds: string[]) {
  if (habitIds.length === 0) {
    return { data: [] as Habit[], error: null };
  }

  const { data, error } = await supabase
    .from("habits")
    .select("id, name, type, unit, is_archived, created_at, updated_at")
    .in("id", habitIds)
    .eq("is_archived", false);

  return { data: (data as Habit[] | null) ?? null, error };
}

export async function createHabit(input: {
  name: string;
  type: HabitType;
  unit?: string | null;
}) {
  const { data, error } = await supabase
    .from("habits")
    .insert({
      name: input.name,
      type: input.type,
      unit: input.unit ?? null,
      is_archived: false
    })
    .select("*")
    .maybeSingle();

  return { data: data as Habit | null, error };
}

export async function fetchHabitLogsForDate(date: string, habitIds: string[]) {
  if (habitIds.length === 0) {
    return { data: [] as HabitLog[], error: null };
  }

  const { data, error } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("date", date)
    .in("habit_id", habitIds);

  return { data: (data as HabitLog[] | null) ?? null, error };
}

export async function upsertHabitLog({
  habitId,
  date,
  value
}: {
  habitId: string;
  date: string;
  value: number;
}) {
  const { data, error } = await supabase
    .from("habit_logs")
    .upsert(
      {
        habit_id: habitId,
        date,
        value
      },
      { onConflict: "habit_id,date" }
    )
    .select("*")
    .maybeSingle();

  return { data: data as HabitLog | null, error };
}
