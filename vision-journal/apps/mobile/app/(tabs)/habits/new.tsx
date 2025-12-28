import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Screen } from "../../../src/components/Screen";
import { createHabit } from "../../../src/features/habits/api";
import { HabitType } from "../../../src/types/domain";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const MAX_NAME_LENGTH = 60;

export default function NewHabitScreen() {
  const [name, setName] = useState("");
  const [type, setType] = useState<HabitType>("BINARY");
  const [unit, setUnit] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const navigateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Habit name is required.");
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saving");
    setError(null);
    const { data, error: createError } = await createHabit({
      name: trimmedName,
      type,
      unit: unit.trim() ? unit.trim() : null
    });

    if (createError || !data) {
      setError(createError?.message ?? "Unable to create habit.");
      setSaveStatus("error");
      return;
    }

    setSaveStatus("saved");
    navigateTimer.current = setTimeout(() => {
      router.replace("/(tabs)/today");
    }, 250);
  }, [name, type, unit]);

  const statusContent = () => {
    if (saveStatus === "saving") {
      return <Text style={styles.statusText}>Saving...</Text>;
    }
    if (saveStatus === "saved") {
      return <Text style={styles.statusText}>Saved</Text>;
    }
    if (saveStatus === "error") {
      return (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Not saved.</Text>
          <Pressable onPress={handleSave}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return null;
  };

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add Habit</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Habit name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="What do you want to track?"
          maxLength={MAX_NAME_LENGTH}
          style={styles.input}
        />
        <Text style={styles.helper}>
          {name.length}/{MAX_NAME_LENGTH}
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.segmented}>
          <Pressable
            onPress={() => setType("BINARY")}
            style={[
              styles.segmentButton,
              type === "BINARY" && styles.segmentButtonActive
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                type === "BINARY" && styles.segmentTextActive
              ]}
            >
              Binary
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setType("NUMERIC")}
            style={[
              styles.segmentButton,
              type === "NUMERIC" && styles.segmentButtonActive
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                type === "NUMERIC" && styles.segmentTextActive
              ]}
            >
              Numeric
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Unit</Text>
        <TextInput
          value={unit}
          onChangeText={setUnit}
          placeholder="Optional (e.g., pages, liters)"
          style={styles.input}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={handleSave}
        style={[styles.primaryButton, saveStatus === "saving" && styles.disabled]}
        disabled={saveStatus === "saving"}
      >
        {saveStatus === "saving" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Save Habit</Text>
        )}
      </Pressable>

      <View style={styles.statusArea}>{statusContent()}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16
  },
  title: {
    fontSize: 28,
    fontWeight: "700"
  },
  field: {
    gap: 8
  },
  label: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#666"
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15
  },
  helper: {
    fontSize: 12,
    color: "#666"
  },
  segmented: {
    flexDirection: "row",
    gap: 8
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d5d5d5",
    alignItems: "center",
    backgroundColor: "#f6f6f6"
  },
  segmentButtonActive: {
    backgroundColor: "#111",
    borderColor: "#111"
  },
  segmentText: {
    fontWeight: "600",
    color: "#333"
  },
  segmentTextActive: {
    color: "#fff"
  },
  primaryButton: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  disabled: {
    opacity: 0.7
  },
  error: {
    color: "#b00020"
  },
  statusArea: {
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
