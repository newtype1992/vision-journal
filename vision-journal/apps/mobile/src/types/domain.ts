type ISODate = string;

type BaseEntity = {
  id: string;
  userId: string;
  createdAt: ISODate;
  updatedAt?: ISODate;
};

export type Habit = BaseEntity & {
  name: string;
  description?: string | null;
  frequency: "daily" | "weekly" | "monthly" | "custom";
  startDate: ISODate;
  isArchived: boolean;
};

export type HabitLog = BaseEntity & {
  habitId: string;
  logDate: ISODate;
  completed: boolean;
  notes?: string | null;
};

export type VisionItem = BaseEntity & {
  title: string;
  description?: string | null;
  targetDate?: ISODate | null;
  isArchived: boolean;
};

export type VisionHabitMap = BaseEntity & {
  visionItemId: string;
  habitId: string;
};

export type JournalEntry = BaseEntity & {
  entryDate: ISODate;
  mood?: string | null;
  content?: string | null;
  isArchived: boolean;
};

export type JournalEntryLink = BaseEntity & {
  journalEntryId: string;
  visionItemId?: string | null;
  habitId?: string | null;
};

export type MonthlySummary = BaseEntity & {
  monthDate: ISODate;
  summary?: string | null;
};
