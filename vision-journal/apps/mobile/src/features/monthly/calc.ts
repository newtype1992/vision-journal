import { Habit, HabitLog, VisionHabitMap, VisionItem } from "../../types/domain";
import { compareDateKeys } from "../../lib/dates";
import { computeHabitConsistency, HabitConsistency } from "../insights/calc";

type JournalEntryRow = {
  date: string;
  content: string | null;
};

export type JournalStats = {
  daysJournaled: number;
  daysWritten: number;
};

export type MonthlyHabitStat = HabitConsistency & {
  habit: Habit;
  hasData: boolean;
};

export function computeJournalStats(entries: JournalEntryRow[]): JournalStats {
  const uniqueDays = new Set<string>();
  let daysWritten = 0;

  entries.forEach((entry) => {
    uniqueDays.add(entry.date);
    if (entry.content && entry.content.trim().length > 0) {
      daysWritten += 1;
    }
  });

  return {
    daysJournaled: uniqueDays.size,
    daysWritten
  };
}

export function computeHabitMonthlyStats(
  habits: Habit[],
  habitLogs: HabitLog[],
  monthStartKey: string,
  monthEndKey: string,
  timeZone: string
): MonthlyHabitStat[] {
  const logsByHabit: Record<string, Record<string, number>> = {};

  habitLogs.forEach((log) => {
    if (!logsByHabit[log.habit_id]) {
      logsByHabit[log.habit_id] = {};
    }
    logsByHabit[log.habit_id][log.date] = log.value ?? 0;
  });

  return habits.map((habit) => {
    const consistency = computeHabitConsistency(
      habit,
      logsByHabit[habit.id] ?? {},
      monthStartKey,
      monthEndKey,
      timeZone
    );
    const hasData =
      compareDateKeys(monthStartKey, monthEndKey) <= 0 &&
      consistency.eligibleDays > 0;
    return {
      ...consistency,
      habit,
      hasData
    };
  });
}

export function computeVisionTrackedCount(
  visionItems: VisionItem[],
  mappings: VisionHabitMap[],
  habitsById: Record<string, Habit>
) {
  const tracked = new Set<string>();
  mappings.forEach((mapping) => {
    if (!habitsById[mapping.habit_id]) return;
    tracked.add(mapping.vision_item_id);
  });
  return visionItems.filter((vision) => tracked.has(vision.id)).length;
}
