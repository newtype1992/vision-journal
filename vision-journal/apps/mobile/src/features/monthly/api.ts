import { supabase } from "../../lib/supabaseClient";
import {
  Habit,
  HabitLog,
  VisionHabitMap,
  VisionItem
} from "../../types/domain";

type JournalEntryRow = {
  id: string;
  date: string;
  content: string | null;
};

export type MonthlyData = {
  journalEntries: JournalEntryRow[];
  habits: Habit[];
  habitLogs: HabitLog[];
  visions: VisionItem[];
  mappings: VisionHabitMap[];
  reflection: string;
};

export async function fetchMonthlyData(
  monthStart: string,
  monthEnd: string,
  monthKey: string
) {
  const [
    { data: journalEntries, error: journalError },
    { data: habits, error: habitsError },
    { data: visions, error: visionsError },
    { data: summary, error: summaryError }
  ] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("id, date, content")
      .gte("date", monthStart)
      .lte("date", monthEnd),
    supabase
      .from("habits")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("vision_items")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("monthly_summaries")
      .select("month, reflection")
      .eq("month", monthKey)
      .maybeSingle()
  ]);

  if (journalError || habitsError || visionsError || summaryError) {
    return {
      data: null,
      error: journalError ?? habitsError ?? visionsError ?? summaryError
    };
  }

  const habitList = (habits as Habit[] | null) ?? [];
  const visionList = (visions as VisionItem[] | null) ?? [];
  const habitIds = habitList.map((habit) => habit.id);
  const visionIds = visionList.map((vision) => vision.id);

  const [{ data: mappings, error: mappingsError }, { data: habitLogs, error: logsError }] =
    await Promise.all([
      visionIds.length > 0
        ? supabase
            .from("vision_habit_maps")
            .select("*")
            .in("vision_item_id", visionIds)
        : Promise.resolve({ data: [] as VisionHabitMap[], error: null }),
      habitIds.length > 0
        ? supabase
            .from("habit_logs")
            .select("*")
            .in("habit_id", habitIds)
            .gte("date", monthStart)
            .lte("date", monthEnd)
        : Promise.resolve({ data: [] as HabitLog[], error: null })
    ]);

  if (mappingsError || logsError) {
    return { data: null, error: mappingsError ?? logsError };
  }

  return {
    data: {
      journalEntries: (journalEntries as JournalEntryRow[] | null) ?? [],
      habits: habitList,
      habitLogs: (habitLogs as HabitLog[] | null) ?? [],
      visions: visionList,
      mappings: (mappings as VisionHabitMap[] | null) ?? [],
      reflection: summary?.reflection ?? ""
    },
    error: null
  };
}

export async function upsertMonthlyReflection(monthKey: string, reflection: string) {
  const { data, error } = await supabase
    .from("monthly_summaries")
    .upsert({ month: monthKey, reflection }, { onConflict: "user_id,month" })
    .select("month, reflection")
    .maybeSingle();

  return { data, error };
}
