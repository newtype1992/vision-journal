export type ISODate = string;

export type HabitType = "BINARY" | "NUMERIC";

export type BaseEntity = {
  id: string;
  created_at: ISODate;
  updated_at: ISODate | null;
};

export type Habit = BaseEntity & {
  user_id?: string;
  name: string;
  type: HabitType;
  unit: string | null;
  is_archived: boolean;
};

export type HabitLog = BaseEntity & {
  user_id?: string;
  habit_id: string;
  date: ISODate;
  value: number | null;
};

export type JournalEntry = BaseEntity & {
  user_id?: string;
  date: ISODate;
  content: string | null;
};

export type VisionType = "SHORT_TERM" | "LONG_TERM";

export type VisionItem = BaseEntity & {
  user_id?: string;
  title: string;
  type: VisionType;
  description: string | null;
  is_archived: boolean;
};

export type VisionHabitMap = {
  id: string;
  user_id?: string;
  vision_item_id: string;
  habit_id: string;
  weight: number | null;
  created_at: ISODate;
};

export type Profile = {
  id: string;
  timezone: string | null;
  week_start_day: number | null;
};
