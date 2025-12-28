import { Habit, VisionItem } from "../../types/domain";
import {
  addDaysToDateKey,
  compareDateKeys,
  diffDateKeysInclusive,
  getDateKey,
  getTodayDateKey
} from "../../lib/dates";

export type RangeKey = "7D" | "30D";

export type DateRange = {
  startKey: string;
  endKey: string;
};

export type HabitConsistency = {
  habitId: string;
  consistency: number;
  doneDays: number;
  eligibleDays: number;
};

export type VisionProgress = {
  progress: number;
  hasData: boolean;
};

export function getDateRange(rangeKey: RangeKey, timeZone: string): DateRange {
  const endKey = getTodayDateKey(timeZone);
  const offset = rangeKey === "7D" ? -6 : -29;
  const startKey = addDaysToDateKey(endKey, offset);
  return { startKey, endKey };
}

function isDoneValue(habit: Habit, value: number) {
  if (habit.type === "BINARY") {
    return value === 1;
  }
  return value >= 1;
}

export function computeHabitConsistency(
  habit: Habit,
  logsByDate: Record<string, number>,
  rangeStartKey: string,
  rangeEndKey: string,
  timeZone: string
): HabitConsistency {
  const createdKey = getDateKey(new Date(habit.created_at), timeZone);
  const eligibleStartKey =
    compareDateKeys(createdKey, rangeStartKey) > 0 ? createdKey : rangeStartKey;
  const eligibleDays = diffDateKeysInclusive(eligibleStartKey, rangeEndKey);

  if (eligibleDays <= 0) {
    return {
      habitId: habit.id,
      consistency: 0,
      doneDays: 0,
      eligibleDays: 0
    };
  }

  const doneDays = Object.entries(logsByDate).reduce((count, [dateKey, value]) => {
    if (
      compareDateKeys(dateKey, eligibleStartKey) >= 0 &&
      compareDateKeys(dateKey, rangeEndKey) <= 0 &&
      isDoneValue(habit, value)
    ) {
      return count + 1;
    }
    return count;
  }, 0);

  return {
    habitId: habit.id,
    consistency: doneDays / eligibleDays,
    doneDays,
    eligibleDays
  };
}

export function computeVisionProgress(
  visionItem: VisionItem,
  linkedHabits: Habit[],
  habitConsistencyMap: Record<string, HabitConsistency>
): VisionProgress {
  if (linkedHabits.length === 0) {
    return { progress: 0, hasData: false };
  }

  const total = linkedHabits.reduce((sum, habit) => {
    return sum + (habitConsistencyMap[habit.id]?.consistency ?? 0);
  }, 0);

  return {
    progress: total / linkedHabits.length,
    hasData: true
  };
}
