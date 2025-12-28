import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Badge } from "../../../src/components/Badge";
import { Banner } from "../../../src/components/Banner";
import { Screen } from "../../../src/components/Screen";
import { listActiveHabits } from "../../../src/features/habits/api";
import {
  addVisionHabitMaps,
  archiveVisionItem,
  getVisionItem,
  listVisionHabitMaps,
  removeVisionHabitMap,
  VisionHabitMapWithHabit
} from "../../../src/features/vision/api";
import { Habit, VisionItem } from "../../../src/types/domain";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const getTypeLabel = (type: VisionItem["type"]) =>
  type === "SHORT_TERM" ? "Short term" : "Long term";

export default function VisionDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visionId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [visionItem, setVisionItem] = useState<VisionItem | null>(null);
  const [visionLoading, setVisionLoading] = useState(true);
  const [visionError, setVisionError] = useState(false);

  const [maps, setMaps] = useState<VisionHabitMapWithHabit[]>([]);
  const [mapsLoading, setMapsLoading] = useState(true);
  const [mapsError, setMapsError] = useState(false);

  const [networkIssue, setNetworkIssue] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState<SaveStatus>("idle");
  const [removeStatuses, setRemoveStatuses] = useState<Record<string, SaveStatus>>(
    {}
  );

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [availableHabits, setAvailableHabits] = useState<Habit[]>([]);
  const [habitsError, setHabitsError] = useState(false);
  const [selectedHabits, setSelectedHabits] = useState<Record<string, boolean>>(
    {}
  );
  const [linkStatus, setLinkStatus] = useState<SaveStatus>("idle");

  const linkedHabitIds = useMemo(
    () => new Set(maps.map((map) => map.habit_id)),
    [maps]
  );

  const linkedHabits = useMemo(
    () =>
      maps
        .filter((map) => map.habits && !map.habits.is_archived)
        .map((map) => ({
          mapId: map.id,
          habitId: map.habit_id,
          habit: map.habits as Habit
        })),
    [maps]
  );

  const loadVisionItem = useCallback(async () => {
    if (!visionId) return;
    setVisionLoading(true);
    const { data, error } = await getVisionItem(visionId);
    if (error || !data) {
      setVisionError(true);
      setNetworkIssue(true);
      setVisionLoading(false);
      return;
    }
    setVisionItem(data);
    setVisionError(false);
    setNetworkIssue(false);
    setVisionLoading(false);
  }, [visionId]);

  const loadMaps = useCallback(async () => {
    if (!visionId) return;
    setMapsLoading(true);
    const { data, error } = await listVisionHabitMaps(visionId);
    if (error) {
      setMapsError(true);
      setNetworkIssue(true);
      setMapsLoading(false);
      return;
    }
    setMaps(data ?? []);
    setMapsError(false);
    setNetworkIssue(false);
    setMapsLoading(false);
  }, [visionId]);

  const loadHabits = useCallback(async () => {
    setHabitsLoading(true);
    const { data, error } = await listActiveHabits();
    if (error) {
      setHabitsError(true);
      setNetworkIssue(true);
      setHabitsLoading(false);
      return;
    }
    setAvailableHabits(data ?? []);
    setHabitsError(false);
    setNetworkIssue(false);
    setHabitsLoading(false);
  }, []);

  useEffect(() => {
    if (!visionId) return;
    loadVisionItem();
    loadMaps();
  }, [loadMaps, loadVisionItem, visionId]);

  useEffect(() => {
    if (!linkModalOpen || availableHabits.length > 0 || habitsLoading) return;
    loadHabits();
  }, [availableHabits.length, habitsLoading, linkModalOpen, loadHabits]);

  const handleRetry = useCallback(() => {
    loadVisionItem();
    loadMaps();
  }, [loadMaps, loadVisionItem]);

  const handleArchive = useCallback(async () => {
    if (!visionId) return;
    setArchiveStatus("saving");
    const { error } = await archiveVisionItem(visionId);
    if (error) {
      setArchiveStatus("error");
      setNetworkIssue(true);
      return;
    }
    setArchiveStatus("saved");
    setNetworkIssue(false);
    router.replace("/(tabs)/vision");
  }, [visionId]);

  const handleRemoveHabit = useCallback(
    async (habitId: string) => {
      if (!visionId) return;
      setRemoveStatuses((prev) => ({ ...prev, [habitId]: "saving" }));
      const { error } = await removeVisionHabitMap(visionId, habitId);
      if (error) {
        setRemoveStatuses((prev) => ({ ...prev, [habitId]: "error" }));
        setNetworkIssue(true);
        return;
      }
      setRemoveStatuses((prev) => ({ ...prev, [habitId]: "saved" }));
      setNetworkIssue(false);
      loadMaps();
    },
    [loadMaps, visionId]
  );

  const handleRetryRemove = useCallback(
    (habitId: string) => {
      handleRemoveHabit(habitId);
    },
    [handleRemoveHabit]
  );

  const toggleHabitSelection = useCallback(
    (habitId: string) => {
      if (linkedHabitIds.has(habitId)) return;
      setSelectedHabits((prev) => ({
        ...prev,
        [habitId]: !prev[habitId]
      }));
    },
    [linkedHabitIds]
  );

  const handleLinkHabits = useCallback(async () => {
    if (!visionId) return;
    const selectedIds = Object.entries(selectedHabits)
      .filter(([, isSelected]) => isSelected)
      .map(([habitId]) => habitId)
      .filter((habitId) => !linkedHabitIds.has(habitId));

    if (selectedIds.length === 0) {
      setLinkModalOpen(false);
      return;
    }

    setLinkStatus("saving");
    const { error } = await addVisionHabitMaps(visionId, selectedIds);
    if (error) {
      setLinkStatus("error");
      setNetworkIssue(true);
      return;
    }
    setLinkStatus("saved");
    setSelectedHabits({});
    setNetworkIssue(false);
    setLinkModalOpen(false);
    loadMaps();
  }, [linkedHabitIds, loadMaps, selectedHabits, visionId]);

  const handleRetryLink = useCallback(() => {
    handleLinkHabits();
  }, [handleLinkHabits]);

  if (!visionId) {
    return (
      <Screen contentContainerStyle={styles.container}>
        <Banner text="Unable to load vision item." />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      {networkIssue || visionError || mapsError || habitsError ? (
        <Banner
          text="Connection issue - changes may not be saved."
          actionLabel="Retry"
          onAction={handleRetry}
        />
      ) : null}

      {visionLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      ) : visionItem ? (
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>{visionItem.title}</Text>
            <Badge label={getTypeLabel(visionItem.type)} />
          </View>
          <View style={styles.archiveBlock}>
            <Pressable
              onPress={handleArchive}
              style={styles.archiveButton}
              disabled={archiveStatus === "saving"}
            >
              {archiveStatus === "saving" ? (
                <ActivityIndicator size="small" color="#111" />
              ) : (
                <Text style={styles.archiveText}>Archive</Text>
              )}
            </Pressable>
            {archiveStatus === "error" ? (
              <View style={styles.statusRow}>
                <Text style={styles.statusText}>Not saved.</Text>
                <Pressable onPress={handleArchive}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={styles.errorText}>Vision item not found.</Text>
      )}

      {visionItem?.description ? (
        <Text style={styles.description}>{visionItem.description}</Text>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Linked Habits</Text>
          <Pressable
            onPress={() => {
              setLinkStatus("idle");
              setHabitsError(false);
              setLinkModalOpen(true);
            }}
            style={styles.linkButton}
          >
            <Text style={styles.linkButtonText}>Link Habits</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {mapsLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color="#666" />
            </View>
          ) : linkedHabits.length === 0 ? (
            <Text style={styles.emptyText}>No linked habits yet.</Text>
          ) : (
            linkedHabits.map(({ habitId, habit }) => (
              <View key={habitId} style={styles.habitRow}>
                <View style={styles.habitInfo}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                </View>
                <Pressable
                  onPress={() => handleRemoveHabit(habitId)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
                {removeStatuses[habitId] === "saving" ? (
                  <Text style={styles.statusText}>Saving...</Text>
                ) : null}
                {removeStatuses[habitId] === "error" ? (
                  <View style={styles.statusRow}>
                    <Text style={styles.statusText}>Not saved.</Text>
                    <Pressable onPress={() => handleRetryRemove(habitId)}>
                      <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      </View>

      <Modal visible={linkModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Link Habits</Text>
            {habitsLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="small" color="#666" />
              </View>
            ) : availableHabits.length === 0 ? (
              <Text style={styles.emptyText}>
                No active habits available to link.
              </Text>
            ) : (
              <View style={styles.modalList}>
                {availableHabits.map((habit) => {
                  const isLinked = linkedHabitIds.has(habit.id);
                  const isSelected = selectedHabits[habit.id] || isLinked;
                  return (
                    <Pressable
                      key={habit.id}
                      onPress={() => toggleHabitSelection(habit.id)}
                      style={[
                        styles.modalRow,
                        isLinked && styles.modalRowDisabled
                      ]}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected
                        ]}
                      />
                      <Text style={styles.modalRowText}>{habit.name}</Text>
                      {isLinked ? (
                        <Text style={styles.linkedText}>Linked</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {linkStatus === "saving" ? (
              <Text style={styles.statusText}>Saving...</Text>
            ) : null}
            {linkStatus === "error" ? (
              <View style={styles.statusRow}>
                <Text style={styles.statusText}>Not saved.</Text>
                <Pressable onPress={handleRetryLink}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setLinkModalOpen(false)}
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleLinkHabits}
                style={[styles.modalButton, styles.modalPrimaryButton]}
              >
                <Text style={styles.modalPrimaryText}>Link Selected</Text>
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
    gap: 16
  },
  loading: {
    paddingVertical: 16,
    alignItems: "center"
  },
  header: {
    gap: 12
  },
  headerTitle: {
    gap: 8
  },
  title: {
    fontSize: 24,
    fontWeight: "700"
  },
  archiveBlock: {
    gap: 6,
    alignItems: "flex-start"
  },
  archiveButton: {
    borderWidth: 1,
    borderColor: "#d5d5d5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  archiveText: {
    color: "#333",
    fontWeight: "600"
  },
  description: {
    color: "#4d4d4d"
  },
  section: {
    gap: 12
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  linkButton: {
    borderWidth: 1,
    borderColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  linkButtonText: {
    fontWeight: "600",
    color: "#111"
  },
  card: {
    backgroundColor: "#f6f6f6",
    borderRadius: 12,
    padding: 16,
    gap: 12
  },
  habitRow: {
    gap: 6
  },
  habitInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  habitName: {
    fontSize: 16,
    fontWeight: "600"
  },
  removeButton: {
    alignSelf: "flex-start"
  },
  removeText: {
    color: "#b00020",
    fontWeight: "600"
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
  emptyText: {
    color: "#4d4d4d"
  },
  errorText: {
    color: "#b00020"
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
    gap: 12,
    maxHeight: "80%"
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  modalList: {
    gap: 10
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8
  },
  modalRowDisabled: {
    opacity: 0.6
  },
  modalRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500"
  },
  linkedText: {
    fontSize: 12,
    color: "#666"
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#999"
  },
  checkboxSelected: {
    backgroundColor: "#111",
    borderColor: "#111"
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
