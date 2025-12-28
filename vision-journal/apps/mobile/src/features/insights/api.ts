import { supabase } from "../../lib/supabaseClient";
import { Habit, HabitLog, VisionHabitMap, VisionItem } from "../../types/domain";

export type ProgressData = {
  habits: Habit[];
  visions: VisionItem[];
  mappings: VisionHabitMap[];
  habitLogs: HabitLog[];
};

export async function fetchProgressData(startDate: string, endDate: string) {
  const [{ data: habits, error: habitsError }, { data: visions, error: visionsError }] =
    await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: true }),
      supabase
        .from("vision_items")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
    ]);

  if (habitsError || visionsError) {
    return { data: null, error: habitsError ?? visionsError };
  }

  const habitList = (habits as Habit[] | null) ?? [];
  const visionList = (visions as VisionItem[] | null) ?? [];
  const habitIds = habitList.map((habit) => habit.id);
  const visionIds = visionList.map((vision) => vision.id);

  const { data: mappings, error: mappingsError } =
    visionIds.length > 0
      ? await supabase
          .from("vision_habit_maps")
          .select("*")
          .in("vision_item_id", visionIds)
      : { data: [] as VisionHabitMap[], error: null };

  if (mappingsError) {
    return { data: null, error: mappingsError };
  }

  const { data: habitLogs, error: logsError } =
    habitIds.length > 0
      ? await supabase
          .from("habit_logs")
          .select("*")
          .in("habit_id", habitIds)
          .gte("date", startDate)
          .lte("date", endDate)
      : { data: [] as HabitLog[], error: null };

  if (logsError) {
    return { data: null, error: logsError };
  }

  return {
    data: {
      habits: habitList,
      visions: visionList,
      mappings: (mappings as VisionHabitMap[] | null) ?? [],
      habitLogs: (habitLogs as HabitLog[] | null) ?? []
    },
    error: null
  };
}
