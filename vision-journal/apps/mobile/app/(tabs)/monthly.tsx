import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Banner } from "../../src/components/Banner";
import { MonthNav } from "../../src/components/MonthNav";
import { ProgressBar } from "../../src/components/ProgressBar";
import { Screen } from "../../src/components/Screen";
import {
  fetchMonthlyData,
  upsertMonthlyReflection
} from "../../src/features/monthly/api";
import {
  computeHabitMonthlyStats,
  computeJournalStats,
  computeVisionTrackedCount,
  MonthlyHabitStat
} from "../../src/features/monthly/calc";
import {
  addMonthsToMonthKey,
  compareMonthKeys,
  formatMonthLabel,
  getDeviceTimeZone,
  getMonthKey,
  getMonthRangeFromKey
} from "../../src/lib/dates";
import { supabase } from "../../src/lib/supabaseClient";
import { Habit, HabitLog, VisionHabitMap, VisionItem } from "../../src/types/domain";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const REFLECTION_DEBOUNCE_MS = 800;
const TOP_HABITS_COUNT = 5;

export default function MonthlyScreen() {
  const [timeZone, setTimeZone] = useState(getDeviceTimeZone());
  const [selectedMonthKey, setSelectedMonthKey] = useState(() =>
    getMonthKey(new Date(), getDeviceTimeZone())
  );
  const [hasUserNavigated, setHasUserNavigated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [journalEntries, setJournalEntries] = useState<
    { date: string; content: string | null }[]
  >([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [visions, setVisions] = useState<VisionItem[]>([]);
  const [mappings, setMappings] = useState<VisionHabitMap[]>([]);

  const [reflection, setReflection] = useState("");
  const [reflectionStatus, setReflectionStatus] = useState<SaveStatus>("idle");
  const [lastSavedReflection, setLastSavedReflection] = useState("");
  const [showAllHabits, setShowAllHabits] = useState(false);

  const reflectionSaveId = useRef(0);
  const reflectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const selectedMonthRef = useRef(selectedMonthKey);

  useEffect(() => {
    selectedMonthRef.current = selectedMonthKey;
  }, [selectedMonthKey]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("timezone")
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setHasError(true);
        return;
      }

      if (data?.timezone) {
        setTimeZone(data.timezone);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (hasUserNavigated) return;
    const currentKey = getMonthKey(new Date(), timeZone);
    setSelectedMonthKey(currentKey);
  }, [hasUserNavigated, timeZone]);

  const currentMonthKey = useMemo(
    () => getMonthKey(new Date(), timeZone),
    [timeZone]
  );
  const isNextDisabled =
    compareMonthKeys(selectedMonthKey, currentMonthKey) >= 0;
  const monthRange = useMemo(
    () => getMonthRangeFromKey(selectedMonthKey),
    [selectedMonthKey]
  );

  const loadMonthlyData = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    const { data, error } = await fetchMonthlyData(
      monthRange.startKey,
      monthRange.endKey,
      selectedMonthKey
    );

    if (error || !data) {
      setHasError(true);
      setLoading(false);
      return;
    }

    setJournalEntries(data.journalEntries);
    setHabits(data.habits);
    setHabitLogs(data.habitLogs);
    setVisions(data.visions);
    setMappings(data.mappings);
    setReflection(data.reflection ?? "");
    setLastSavedReflection(data.reflection ?? "");
    setReflectionStatus("saved");
    setLoading(false);
  }, [monthRange.endKey, monthRange.startKey, selectedMonthKey]);

  useEffect(() => {
    loadMonthlyData();
  }, [loadMonthlyData]);

  const habitsById = useMemo(() => {
    const map: Record<string, Habit> = {};
    habits.forEach((habit) => {
      map[habit.id] = habit;
    });
    return map;
  }, [habits]);

  const journalStats = useMemo(() => {
    return computeJournalStats(journalEntries);
  }, [journalEntries]);

  const habitStats = useMemo(() => {
    const stats = computeHabitMonthlyStats(
      habits,
      habitLogs,
      monthRange.startKey,
      monthRange.endKey,
      timeZone
    );
    return stats.sort((left, right) => right.consistency - left.consistency);
  }, [habitLogs, habits, monthRange.endKey, monthRange.startKey, timeZone]);

  const visibleHabits = useMemo(() => {
    if (showAllHabits) return habitStats;
    return habitStats.slice(0, TOP_HABITS_COUNT);
  }, [habitStats, showAllHabits]);

  const trackedVisionCount = useMemo(() => {
    return computeVisionTrackedCount(visions, mappings, habitsById);
  }, [habitsById, mappings, visions]);

  const handlePrevMonth = () => {
    setHasUserNavigated(true);
    setSelectedMonthKey((prev) => addMonthsToMonthKey(prev, -1));
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    setHasUserNavigated(true);
    setSelectedMonthKey((prev) => addMonthsToMonthKey(prev, 1));
  };

  const saveReflection = useCallback(
    async (text: string) => {
      if (text === lastSavedReflection) {
        setReflectionStatus("saved");
        return;
      }

      const requestId = reflectionSaveId.current + 1;
      reflectionSaveId.current = requestId;
      const targetMonth = selectedMonthKey;
      setReflectionStatus("saving");

      const { error } = await upsertMonthlyReflection(targetMonth, text);

      if (
        selectedMonthRef.current !== targetMonth ||
        reflectionSaveId.current !== requestId
      ) {
        return;
      }

      if (error) {
        setReflectionStatus("error");
        return;
      }

      setReflectionStatus("saved");
      setLastSavedReflection(text);
    },
    [lastSavedReflection, selectedMonthKey]
  );

  useEffect(() => {
    if (loading) return;
    if (reflection === lastSavedReflection) return;

    if (reflectionDebounceRef.current) {
      clearTimeout(reflectionDebounceRef.current);
    }

    reflectionDebounceRef.current = setTimeout(() => {
      saveReflection(reflection);
    }, REFLECTION_DEBOUNCE_MS);

    return () => {
      if (reflectionDebounceRef.current) {
        clearTimeout(reflectionDebounceRef.current);
      }
    };
  }, [lastSavedReflection, loading, reflection, saveReflection]);

  const handleReflectionBlur = () => {
    if (reflection === lastSavedReflection) return;
    saveReflection(reflection);
  };

  const reflectionStatusContent = useMemo(() => {
    if (reflectionStatus === "saving") {
      return <Text style={styles.statusText}>Saving...</Text>;
    }
    if (reflectionStatus === "saved") {
      return <Text style={styles.statusText}>Saved</Text>;
    }
    if (reflectionStatus === "error") {
      return (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Not saved.</Text>
          <Pressable onPress={() => saveReflection(reflection)}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return null;
  }, [reflection, reflectionStatus, saveReflection]);

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      {hasError ? (
        <Banner
          text="Connection issue - month summary may be incomplete."
          actionLabel="Retry"
          onAction={loadMonthlyData}
        />
      ) : null}

      <View style={styles.header}>
        <Text style={styles.title}>Monthly</Text>
        <MonthNav
          label={formatMonthLabel(selectedMonthKey, timeZone)}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
          disableNext={isNextDisabled}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Summary</Text>
        <View style={styles.card}>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color="#666" />
            </View>
          ) : (
            <>
              <View style={styles.summaryGroup}>
                <Text style={styles.summaryLabel}>Journal</Text>
                <Text style={styles.summaryValue}>
                  Days journaled: {journalStats.daysJournaled}
                </Text>
                <Text style={styles.summaryValue}>
                  Days written: {journalStats.daysWritten}
                </Text>
              </View>

              <View style={styles.summaryGroup}>
                <Text style={styles.summaryLabel}>Vision</Text>
                <Text style={styles.summaryValue}>
                  Vision items tracked: {trackedVisionCount}
                </Text>
              </View>

              <View style={styles.summaryGroup}>
                <View style={styles.summaryHeader}>
                  <Text style={styles.summaryLabel}>Habits</Text>
                  {habitStats.length > TOP_HABITS_COUNT ? (
                    <Pressable
                      onPress={() => setShowAllHabits((prev) => !prev)}
                    >
                      <Text style={styles.linkText}>
                        {showAllHabits ? "Show fewer" : "Show all habits"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {habits.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      No habits yet. Add one to start tracking consistency.
                    </Text>
                    <Pressable
                      style={styles.primaryButton}
                      onPress={() => router.push("/(tabs)/habits/new")}
                    >
                      <Text style={styles.primaryButtonText}>Add Habit</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.habitList}>
                    {visibleHabits.map((stat: MonthlyHabitStat) => {
                      const percent = Math.round(stat.consistency * 100);
                      const detail =
                        stat.eligibleDays <= 0
                          ? "--"
                          : `${stat.doneDays}/${stat.eligibleDays}`;
                      return (
                        <View key={stat.habit.id} style={styles.habitRow}>
                          <View style={styles.itemHeader}>
                            <Text style={styles.itemTitle}>
                              {stat.habit.name}
                            </Text>
                            <Text style={styles.percentText}>{percent}%</Text>
                          </View>
                          <ProgressBar value={stat.consistency} />
                          <Text style={styles.detailText}>{detail}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reflection</Text>
        <View style={styles.card}>
          <TextInput
            value={reflection}
            onChangeText={setReflection}
            placeholder="What defined this month?"
            multiline
            onBlur={handleReflectionBlur}
            textAlignVertical="top"
            style={styles.textArea}
          />
          <View style={styles.cardFooter}>{reflectionStatusContent}</View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 20
  },
  header: {
    gap: 12
  },
  title: {
    fontSize: 28,
    fontWeight: "700"
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700"
  },
  card: {
    backgroundColor: "#f6f6f6",
    borderRadius: 12,
    padding: 16,
    gap: 16
  },
  loading: {
    paddingVertical: 20,
    alignItems: "center"
  },
  summaryGroup: {
    gap: 6
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  summaryLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#666"
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600"
  },
  habitList: {
    gap: 12
  },
  habitRow: {
    gap: 8
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1
  },
  percentText: {
    fontSize: 14,
    fontWeight: "600"
  },
  detailText: {
    fontSize: 12,
    color: "#666"
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
  linkText: {
    color: "#1a4fd7",
    fontWeight: "600",
    fontSize: 12
  },
  textArea: {
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
  }
});
