import { supabase } from "../../lib/supabaseClient";
import { Habit, VisionHabitMap, VisionItem, VisionType } from "../../types/domain";

export async function listVisionItems() {
  const { data, error } = await supabase
    .from("vision_items")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  return { data: (data as VisionItem[] | null) ?? null, error };
}

export async function createVisionItem(input: {
  title: string;
  type: VisionType;
  description?: string;
}) {
  const { data, error } = await supabase
    .from("vision_items")
    .insert({
      title: input.title,
      type: input.type,
      description: input.description ?? null,
      is_archived: false
    })
    .select("*")
    .maybeSingle();

  return { data: data as VisionItem | null, error };
}

export async function getVisionItem(id: string) {
  const { data, error } = await supabase
    .from("vision_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return { data: data as VisionItem | null, error };
}

export async function archiveVisionItem(id: string) {
  const { data, error } = await supabase
    .from("vision_items")
    .update({ is_archived: true })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  return { data: data as VisionItem | null, error };
}

export type VisionHabitMapWithHabit = VisionHabitMap & {
  habits: Habit | null;
};

export async function listVisionHabitMaps(visionItemId: string) {
  const { data, error } = await supabase
    .from("vision_habit_maps")
    .select("id, habit_id, vision_item_id, weight, created_at, habits (id, name, type, unit, is_archived)")
    .eq("vision_item_id", visionItemId);

  return { data: (data as VisionHabitMapWithHabit[] | null) ?? null, error };
}

export async function addVisionHabitMaps(
  visionItemId: string,
  habitIds: string[]
) {
  if (habitIds.length === 0) {
    return { data: [] as VisionHabitMap[], error: null };
  }

  const payload = habitIds.map((habitId) => ({
    vision_item_id: visionItemId,
    habit_id: habitId
  }));

  const { data, error } = await supabase
    .from("vision_habit_maps")
    .insert(payload)
    .select("*");

  return { data: (data as VisionHabitMap[] | null) ?? null, error };
}

export async function removeVisionHabitMap(
  visionItemId: string,
  habitId: string
) {
  const { error } = await supabase
    .from("vision_habit_maps")
    .delete()
    .eq("vision_item_id", visionItemId)
    .eq("habit_id", habitId);

  return { error };
}
