import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Banner } from "../../src/components/Banner";
import { ProgressBar } from "../../src/components/ProgressBar";
import { Screen } from "../../src/components/Screen";
import { fetchProgressData } from "../../src/features/insights/api";
import {
  computeHabitConsistency,
  computeVisionProgress,
  getDateRange,
  HabitConsistency,
  RangeKey,
  VisionProgress
} from "../../src/features/insights/calc";
import { getDeviceTimeZone } from "../../src/lib/dates";
import { supabase } from "../../src/lib/supabaseClient";
import { Habit, VisionItem } from "../../src/types/domain";

type HabitConsistencyState = {
  list: HabitConsistency[];
  map: Record<string, HabitConsistency>;
};

export default function ProgressScreen() {
  const [rangeKey, setRangeKey] = useState<RangeKey>("30D");
  const [timeZone, setTimeZone] = useState(getDeviceTimeZone());
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [visions, setVisions] = useState<VisionItem[]>([]);
  const [mappings, setMappings] = useState<
    { vision_item_id: string; habit_id: string }[]
  >([]);
  const [habitLogs, setHabitLogs] = useState<
    { habit_id: string; date: string; value: number | null }[]
  >([]);

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

  const range = useMemo(
    () => getDateRange(rangeKey, timeZone),
    [rangeKey, timeZone]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchProgressData(
      range.startKey,
      range.endKey
    );

    if (error || !data) {
      setHasError(true);
      setLoading(false);
      return;
    }

    setHabits(data.habits);
    setVisions(data.visions);
    setMappings(data.mappings);
    setHabitLogs(data.habitLogs);
    setHasError(false);
    setLoading(false);
  }, [range.endKey, range.startKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const logsByHabit = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    habitLogs.forEach((log) => {
      if (!map[log.habit_id]) {
        map[log.habit_id] = {};
      }
      map[log.habit_id][log.date] = log.value ?? 0;
    });
    return map;
  }, [habitLogs]);

  const habitConsistency = useMemo<HabitConsistencyState>(() => {
    const map: Record<string, HabitConsistency> = {};
    const list = habits.map((habit) => {
      const result = computeHabitConsistency(
        habit,
        logsByHabit[habit.id] ?? {},
        range.startKey,
        range.endKey,
        timeZone
      );
      map[habit.id] = result;
      return result;
    });
    return { list, map };
  }, [habits, logsByHabit, range.endKey, range.startKey, timeZone]);

  const habitsById = useMemo(() => {
    const map: Record<string, Habit> = {};
    habits.forEach((habit) => {
      map[habit.id] = habit;
    });
    return map;
  }, [habits]);

  const visionHabitsMap = useMemo(() => {
    const map: Record<string, Habit[]> = {};
    mappings.forEach((mapping) => {
      const habit = habitsById[mapping.habit_id];
      if (!habit) return;
      if (!map[mapping.vision_item_id]) {
        map[mapping.vision_item_id] = [];
      }
      map[mapping.vision_item_id].push(habit);
    });
    return map;
  }, [habitsById, mappings]);

  const visionProgressMap = useMemo(() => {
    const map: Record<string, VisionProgress> = {};
    visions.forEach((vision) => {
      const linkedHabits = visionHabitsMap[vision.id] ?? [];
      map[vision.id] = computeVisionProgress(
        vision,
        linkedHabits,
        habitConsistency.map
      );
    });
    return map;
  }, [habitConsistency.map, visionHabitsMap, visions]);

  const handleRangeChange = (nextRange: RangeKey) => {
    setRangeKey(nextRange);
  };

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      {hasError ? (
        <Banner
          text="Connection issue - progress may be incomplete."
          actionLabel="Retry"
          onAction={loadData}
        />
      ) : null}

      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <View style={styles.rangeToggle}>
          {(["7D", "30D"] as RangeKey[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => handleRangeChange(key)}
              style={[
                styles.rangeButton,
                key === rangeKey && styles.rangeButtonActive
              ]}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  key === rangeKey && styles.rangeButtonTextActive
                ]}
              >
                {key}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vision Progress</Text>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#666" />
          </View>
        ) : visions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No vision items yet. Add one to see progress toward your goals.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/vision/new")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Add Vision Item</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            {visions.map((vision) => {
              const progress = visionProgressMap[vision.id];
              const percent = Math.round((progress?.progress ?? 0) * 100);
              return (
                <Pressable
                  key={vision.id}
                  onPress={() => router.push(`/(tabs)/vision/${vision.id}`)}
                  style={styles.itemRow}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{vision.title}</Text>
                    <Text style={styles.percentText}>{percent}%</Text>
                  </View>
                  <ProgressBar value={(progress?.progress ?? 0) || 0} />
                  {!progress?.hasData ? (
                    <Text style={styles.helperText}>
                      Link habits to track progress
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Habit Consistency</Text>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color="#666" />
          </View>
        ) : habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No habits yet. Add one to start tracking consistency.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/habits/new")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Add Habit</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            {habits.map((habit) => {
              const consistency = habitConsistency.map[habit.id];
              const percent = Math.round((consistency?.consistency ?? 0) * 100);
              const doneDays = consistency?.doneDays ?? 0;
              const eligibleDays = consistency?.eligibleDays ?? 0;
              return (
                <View key={habit.id} style={styles.itemRow}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>{habit.name}</Text>
                    <Text style={styles.percentText}>{percent}%</Text>
                  </View>
                  <ProgressBar value={(consistency?.consistency ?? 0) || 0} />
                  <Text style={styles.detailText}>
                    {doneDays}/{eligibleDays}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: 28,
    fontWeight: "700"
  },
  rangeToggle: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    padding: 4,
    gap: 4
  },
  rangeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  rangeButtonActive: {
    backgroundColor: "#111"
  },
  rangeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444"
  },
  rangeButtonTextActive: {
    color: "#fff"
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700"
  },
  loading: {
    paddingVertical: 16,
    alignItems: "center"
  },
  card: {
    backgroundColor: "#f6f6f6",
    borderRadius: 12,
    padding: 16,
    gap: 16
  },
  itemRow: {
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
  helperText: {
    fontSize: 12,
    color: "#666"
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
  }
});
