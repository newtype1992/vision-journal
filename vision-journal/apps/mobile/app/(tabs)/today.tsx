import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { Screen } from "../../src/components/Screen";
import { fetchActiveHabits, fetchHabitLogsForDate, upsertHabitLog } from "../../src/features/habits/api";
import { fetchJournalEntry, upsertJournalEntry } from "../../src/features/journal/api";
import {
  addDays,
  dateFromDateKey,
  formatMonthDay,
  formatWeekday,
  getDateKey,
  getDeviceTimeZone
} from "../../src/lib/dates";
import { supabase } from "../../src/lib/supabaseClient";
import { useAuth } from "../../src/state/auth";
import { Habit } from "../../src/types/domain";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const JOURNAL_DEBOUNCE_MS = 800;
const HABIT_DEBOUNCE_MS = 800;

export default function TodayScreen() {
  const { user } = useAuth();
  const [timeZone, setTimeZone] = useState(getDeviceTimeZone());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [networkIssue, setNetworkIssue] = useState(false);

  const [journalLoading, setJournalLoading] = useState(true);
  const [journalContent, setJournalContent] = useState("");
  const [journalStatus, setJournalStatus] = useState<SaveStatus>("idle");
  const [lastSavedJournalContent, setLastSavedJournalContent] = useState("");

  const [habitsLoading, setHabitsLoading] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogsLoading, setHabitLogsLoading] = useState(true);
  const [habitValues, setHabitValues] = useState<Record<string, number | null>>({});
  const [habitInputValues, setHabitInputValues] = useState<Record<string, string>>(
    {}
  );
  const [habitSaveStates, setHabitSaveStates] = useState<
    Record<string, SaveStatus>
  >({});

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState("");
  const [datePickerError, setDatePickerError] = useState<string | null>(null);

  const journalSaveId = useRef(0);
  const selectedDateKeyRef = useRef("");
  const journalDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const habitDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const habitSaveRequestIdRef = useRef<Record<string, number>>({});
  const lastSavedHabitValuesRef = useRef<Record<string, number | null>>({});

  const selectedDateKey = useMemo(
    () => getDateKey(selectedDate, timeZone),
    [selectedDate, timeZone]
  );
  const todayKey = useMemo(() => getDateKey(new Date(), timeZone), [timeZone]);
  const isToday = selectedDateKey === todayKey;
  const canGoTomorrow = selectedDateKey < todayKey;
  const headerText = isToday
    ? `Today: ${formatMonthDay(selectedDate, timeZone)}`
    : `${formatWeekday(selectedDate, timeZone)}: ${formatMonthDay(
        selectedDate,
        timeZone
      )}`;

  useEffect(() => {
    selectedDateKeyRef.current = selectedDateKey;
  }, [selectedDateKey]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("timezone, week_start_day")
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setNetworkIssue(true);
        return;
      }

      if (data?.timezone) {
        setTimeZone(data.timezone);
      }
    };

    if (user) {
      loadProfile();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setJournalLoading(true);
    setJournalStatus("idle");

    const loadJournal = async () => {
      const { data, error } = await fetchJournalEntry(selectedDateKey);

      if (!isMounted) return;

      if (error) {
        setNetworkIssue(true);
        setJournalContent("");
        setLastSavedJournalContent("");
        setJournalStatus("idle");
        setJournalLoading(false);
        return;
      }

      const content = data?.content ?? "";
      setJournalContent(content);
      setLastSavedJournalContent(content);
      setJournalStatus("saved");
      setJournalLoading(false);
      setNetworkIssue(false);
    };

    loadJournal();

    return () => {
      isMounted = false;
    };
  }, [selectedDateKey, user]);

  const saveJournal = useCallback(
    async (content: string) => {
      if (content === lastSavedJournalContent) {
        setJournalStatus("saved");
        return;
      }

      const requestId = journalSaveId.current + 1;
      journalSaveId.current = requestId;
      const targetDateKey = selectedDateKey;

      setJournalStatus("saving");
      const { error } = await upsertJournalEntry(targetDateKey, content);

      if (
        selectedDateKeyRef.current !== targetDateKey ||
        journalSaveId.current !== requestId
      ) {
        return;
      }

      if (error) {
        setJournalStatus("error");
        setNetworkIssue(true);
        return;
      }

      setJournalStatus("saved");
      setLastSavedJournalContent(content);
      setNetworkIssue(false);
    },
    [lastSavedJournalContent, selectedDateKey]
  );

  useEffect(() => {
    if (journalLoading) return;
    if (journalContent === lastSavedJournalContent) return;

    if (journalDebounceRef.current) {
      clearTimeout(journalDebounceRef.current);
    }

    journalDebounceRef.current = setTimeout(() => {
      saveJournal(journalContent);
    }, JOURNAL_DEBOUNCE_MS);

    return () => {
      if (journalDebounceRef.current) {
        clearTimeout(journalDebounceRef.current);
      }
    };
  }, [journalContent, journalLoading, lastSavedJournalContent, saveJournal]);

  const handleJournalBlur = useCallback(() => {
    if (journalContent === lastSavedJournalContent) return;
    saveJournal(journalContent);
  }, [journalContent, lastSavedJournalContent, saveJournal]);

  const loadHabits = useCallback(async () => {
    if (!user) return;
    setHabitsLoading(true);
    const { data, error } = await fetchActiveHabits();

    if (error) {
      setNetworkIssue(true);
      setHabits([]);
      setHabitsLoading(false);
      return;
    }

    setHabits(data ?? []);
    setHabitsLoading(false);
    setNetworkIssue(false);
  }, [user]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [loadHabits])
  );

  useEffect(() => {
    Object.values(habitDebounceRef.current).forEach((timeout) => {
      clearTimeout(timeout);
    });
    habitDebounceRef.current = {};
    lastSavedHabitValuesRef.current = {};
    setHabitValues({});
    setHabitInputValues({});
    setHabitSaveStates({});
  }, [selectedDateKey]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const loadHabitLogs = async () => {
      setHabitLogsLoading(true);
      const habitIds = habits.map((habit) => habit.id);
      const { data, error } = await fetchHabitLogsForDate(
        selectedDateKey,
        habitIds
      );

      if (!isMounted) return;

      if (error) {
        setNetworkIssue(true);
        setHabitLogsLoading(false);
        return;
      }

      const logMap = new Map(
        (data ?? []).map((log) => [log.habit_id, log])
      );
      const nextValues: Record<string, number | null> = {};
      const nextInputs: Record<string, string> = {};
      const nextStatuses: Record<string, SaveStatus> = {};

      habits.forEach((habit) => {
        const log = logMap.get(habit.id);
        const value = log?.value ?? null;
        nextValues[habit.id] = value;
        if (habit.type === "NUMERIC") {
          nextInputs[habit.id] = value !== null ? String(value) : "";
        }
        nextStatuses[habit.id] = "saved";
      });

      lastSavedHabitValuesRef.current = nextValues;
      setHabitValues(nextValues);
      setHabitInputValues(nextInputs);
      setHabitSaveStates(nextStatuses);
      setHabitLogsLoading(false);
      setNetworkIssue(false);
    };

    if (habitsLoading) return;

    if (habits.length === 0) {
      lastSavedHabitValuesRef.current = {};
      setHabitValues({});
      setHabitInputValues({});
      setHabitSaveStates({});
      setHabitLogsLoading(false);
      return;
    }

    loadHabitLogs();

    return () => {
      isMounted = false;
    };
  }, [habits, habitsLoading, selectedDateKey, user]);

  const saveHabitValue = useCallback(
    async (habit: Habit, value: number) => {
      const normalizedValue = Number.isFinite(value) ? Math.max(0, value) : 0;
      const lastSavedValue = lastSavedHabitValuesRef.current[habit.id] ?? null;
      if (lastSavedValue === normalizedValue) {
        setHabitSaveStates((prev) => ({ ...prev, [habit.id]: "saved" }));
        return;
      }

      const requestId = (habitSaveRequestIdRef.current[habit.id] ?? 0) + 1;
      habitSaveRequestIdRef.current[habit.id] = requestId;
      const targetDateKey = selectedDateKey;

      setHabitSaveStates((prev) => ({ ...prev, [habit.id]: "saving" }));

      const { error } = await upsertHabitLog({
        habitId: habit.id,
        date: targetDateKey,
        value: normalizedValue
      });

      if (
        selectedDateKeyRef.current !== targetDateKey ||
        habitSaveRequestIdRef.current[habit.id] !== requestId
      ) {
        return;
      }

      if (error) {
        setHabitSaveStates((prev) => ({ ...prev, [habit.id]: "error" }));
        setNetworkIssue(true);
        return;
      }

      lastSavedHabitValuesRef.current[habit.id] = normalizedValue;
      setHabitSaveStates((prev) => ({ ...prev, [habit.id]: "saved" }));
      setNetworkIssue(false);
    },
    [selectedDateKey]
  );

  const parseNumericValue = useCallback((text: string) => {
    if (!text.trim()) return 0;
    const parsed = Number(text);
    if (Number.isNaN(parsed)) {
      return 0;
    }
    return parsed < 0 ? 0 : parsed;
  }, []);

  const scheduleHabitSave = useCallback(
    (habit: Habit, text: string) => {
      if (habitDebounceRef.current[habit.id]) {
        clearTimeout(habitDebounceRef.current[habit.id]);
      }

      habitDebounceRef.current[habit.id] = setTimeout(() => {
        const value = parseNumericValue(text);
        saveHabitValue(habit, value);
      }, HABIT_DEBOUNCE_MS);
    },
    [parseNumericValue, saveHabitValue]
  );

  const handleToggleHabit = useCallback(
    (habit: Habit) => {
      const currentValue = habitValues[habit.id] ?? 0;
      const nextValue = currentValue === 1 ? 0 : 1;
      setHabitValues((prev) => ({ ...prev, [habit.id]: nextValue }));
      saveHabitValue(habit, nextValue);
    },
    [habitValues, saveHabitValue]
  );

  const handleNumericChange = useCallback(
    (habit: Habit, text: string) => {
      setHabitInputValues((prev) => ({ ...prev, [habit.id]: text }));
      const parsedValue = parseNumericValue(text);
      setHabitValues((prev) => ({ ...prev, [habit.id]: parsedValue }));
      scheduleHabitSave(habit, text);
    },
    [parseNumericValue, scheduleHabitSave]
  );

  const handleNumericBlur = useCallback(
    (habit: Habit) => {
      const text = habitInputValues[habit.id] ?? "";
      const value = parseNumericValue(text);
      saveHabitValue(habit, value);
    },
    [habitInputValues, parseNumericValue, saveHabitValue]
  );

  const handleRetryHabit = useCallback(
    (habit: Habit) => {
      const value = habitValues[habit.id] ?? 0;
      saveHabitValue(habit, value);
    },
    [habitValues, saveHabitValue]
  );

  const openDatePicker = useCallback(() => {
    setDatePickerError(null);
    setDatePickerValue(selectedDateKey);
    setDatePickerOpen(true);
  }, [selectedDateKey]);

  const handleApplyDate = useCallback(() => {
    const candidate = dateFromDateKey(datePickerValue.trim(), timeZone);
    if (!candidate) {
      setDatePickerError("Enter a valid date (YYYY-MM-DD).");
      return;
    }

    const candidateKey = getDateKey(candidate, timeZone);
    if (candidateKey > todayKey) {
      setDatePickerError("Future dates are not allowed.");
      return;
    }

    setSelectedDate(candidate);
    setDatePickerOpen(false);
  }, [datePickerValue, timeZone, todayKey]);

  const recentDates = useMemo(() => {
    const items: { key: string; label: string }[] = [];
    for (let index = 0; index < 14; index += 1) {
      const date = addDays(new Date(), -index);
      items.push({
        key: getDateKey(date, timeZone),
        label: `${formatWeekday(date, timeZone)} - ${formatMonthDay(
          date,
          timeZone
        )}`
      });
    }
    return items;
  }, [timeZone, todayKey]);

  const handlePickRecentDate = useCallback(
    (dateKey: string) => {
      const parsed = dateFromDateKey(dateKey, timeZone);
      if (!parsed) return;
      setSelectedDate(parsed);
      setDatePickerOpen(false);
    },
    [timeZone]
  );

  const journalStatusContent = useMemo(() => {
    if (journalStatus === "saving") {
      return <Text style={styles.statusText}>Saving...</Text>;
    }
    if (journalStatus === "saved") {
      return <Text style={styles.statusText}>Saved</Text>;
    }
    if (journalStatus === "error") {
      return (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Not saved.</Text>
          <Pressable onPress={() => saveJournal(journalContent)}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return null;
  }, [journalContent, journalStatus, saveJournal]);

  const renderHabitStatus = (habitId: string, habit: Habit) => {
    const status = habitSaveStates[habitId] ?? "idle";
    if (status === "saving") {
      return <Text style={styles.statusText}>Saving...</Text>;
    }
    if (status === "saved") {
      return <Text style={styles.statusText}>Saved</Text>;
    }
    if (status === "error") {
      return (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Not saved.</Text>
          <Pressable onPress={() => handleRetryHabit(habit)}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return null;
  };

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      {networkIssue ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Connection issue - changes may not be saved.
          </Text>
        </View>
      ) : null}

      <View style={styles.dateNav}>
        <Pressable
          onPress={() => setSelectedDate(addDays(selectedDate, -1))}
          style={styles.navSide}
        >
          <Text style={styles.navText}>{"< Yesterday"}</Text>
        </Pressable>

        <Text style={styles.dateTitle}>{headerText}</Text>

        <Pressable
          onPress={() =>
            canGoTomorrow ? setSelectedDate(addDays(selectedDate, 1)) : null
          }
          style={styles.navSide}
          disabled={!canGoTomorrow}
        >
          <Text
            style={[styles.navText, !canGoTomorrow && styles.navTextDisabled]}
          >
            {"Tomorrow >"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Journal</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Journal Entry</Text>
          {journalLoading ? (
            <View style={styles.skeletonBlock} />
          ) : (
            <TextInput
              value={journalContent}
              onChangeText={setJournalContent}
              placeholder="What stood out today?"
              multiline
              onBlur={handleJournalBlur}
              style={styles.textInput}
              textAlignVertical="top"
            />
          )}
          <View style={styles.cardFooter}>{journalStatusContent}</View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Habits</Text>
          {habitLogsLoading && !habitsLoading ? (
            <ActivityIndicator size="small" color="#666" />
          ) : null}
        </View>
        <View style={styles.card}>
          {habitsLoading ? (
            <View style={styles.skeletonList}>
              <View style={styles.skeletonRow} />
              <View style={styles.skeletonRow} />
            </View>
          ) : habits.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No habits yet. Add one to start tracking.
              </Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => router.push("/(tabs)/habits/new")}
              >
                <Text style={styles.primaryButtonText}>Add Habit</Text>
              </Pressable>
            </View>
          ) : (
            habits.map((habit) => (
              <View key={habit.id} style={styles.habitItem}>
                <View style={styles.habitRow}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  {habit.type === "BINARY" ? (
                    <View style={styles.habitControl}>
                      <Text style={styles.habitControlLabel}>Done</Text>
                      <Switch
                        value={(habitValues[habit.id] ?? 0) === 1}
                        onValueChange={() => handleToggleHabit(habit)}
                      />
                    </View>
                  ) : (
                    <View style={styles.habitControl}>
                      <TextInput
                        value={habitInputValues[habit.id] ?? ""}
                        onChangeText={(text) => handleNumericChange(habit, text)}
                        onBlur={() => handleNumericBlur(habit)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        style={styles.numericInput}
                        textAlign="right"
                      />
                      {habit.unit ? (
                        <Text style={styles.unitText}>{habit.unit}</Text>
                      ) : null}
                    </View>
                  )}
                </View>
                <View style={styles.habitStatus}>
                  {renderHabitStatus(habit.id, habit)}
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      <Pressable style={styles.secondaryButton} onPress={openDatePicker}>
        <Text style={styles.secondaryButtonText}>Pick a Date</Text>
      </Pressable>

      <Modal visible={datePickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pick a Date</Text>
            <Text style={styles.modalLabel}>Enter YYYY-MM-DD</Text>
            <TextInput
              value={datePickerValue}
              onChangeText={setDatePickerValue}
              placeholder="2025-01-08"
              autoCapitalize="none"
              style={styles.modalInput}
            />
            {datePickerError ? (
              <Text style={styles.errorText}>{datePickerError}</Text>
            ) : null}
            <View style={styles.recentDates}>
              {recentDates.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => handlePickRecentDate(item.key)}
                  style={styles.recentDateButton}
                >
                  <Text style={styles.recentDateText}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalButton}
                onPress={() => setDatePickerOpen(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalPrimaryButton]}
                onPress={handleApplyDate}
              >
                <Text style={styles.modalPrimaryText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 20
  },
  banner: {
    backgroundColor: "#fff4d6",
    borderColor: "#f0c36d",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10
  },
  bannerText: {
    color: "#5c3d00",
    fontWeight: "600"
  },
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  navSide: {
    width: 96
  },
  navText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222"
  },
  navTextDisabled: {
    color: "#b0b0b0"
  },
  dateTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600"
  },
  section: {
    gap: 12
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700"
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f6f6f6",
    gap: 12
  },
  label: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#666"
  },
  textInput: {
    minHeight: 140,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    fontSize: 15
  },
  cardFooter: {
    alignItems: "flex-end"
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  statusText: {
    fontSize: 12,
    color: "#666"
  },
  retryText: {
    fontSize: 12,
    color: "#1a4fd7",
    fontWeight: "600"
  },
  skeletonBlock: {
    height: 140,
    borderRadius: 10,
    backgroundColor: "#e7e7e7"
  },
  skeletonList: {
    gap: 12
  },
  skeletonRow: {
    height: 48,
    backgroundColor: "#e7e7e7",
    borderRadius: 8
  },
  emptyState: {
    gap: 12
  },
  emptyText: {
    color: "#4d4d4d"
  },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#111",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  habitItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e2e2"
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  habitName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1
  },
  habitControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  habitControlLabel: {
    fontSize: 12,
    color: "#666"
  },
  numericInput: {
    minWidth: 80,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#d5d5d5",
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 14
  },
  unitText: {
    fontSize: 12,
    color: "#666"
  },
  habitStatus: {
    marginTop: 6
  },
  secondaryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f1f1f"
  },
  secondaryButtonText: {
    color: "#1f1f1f",
    fontWeight: "600"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    padding: 24
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  modalLabel: {
    fontSize: 12,
    color: "#666"
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d5d5d5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },
  errorText: {
    color: "#b00020",
    fontSize: 12
  },
  recentDates: {
    gap: 8
  },
  recentDateButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f4f4f4"
  },
  recentDateText: {
    fontSize: 13,
    color: "#333"
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c9c9c9"
  },
  modalButtonText: {
    color: "#333",
    fontWeight: "600"
  },
  modalPrimaryButton: {
    backgroundColor: "#111",
    borderColor: "#111"
  },
  modalPrimaryText: {
    color: "#fff",
    fontWeight: "600"
  }
});
