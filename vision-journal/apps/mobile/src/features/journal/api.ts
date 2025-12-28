import { supabase } from "../../lib/supabaseClient";
import { JournalEntry } from "../../types/domain";

export async function fetchJournalEntry(date: string) {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  return { data: data as JournalEntry | null, error };
}

export async function upsertJournalEntry(date: string, content: string) {
  const { data, error } = await supabase
    .from("journal_entries")
    .upsert({ date, content }, { onConflict: "user_id,date" })
    .select("*")
    .maybeSingle();

  return { data: data as JournalEntry | null, error };
}
