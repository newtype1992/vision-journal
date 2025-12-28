import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Banner } from "../../../src/components/Banner";
import { Screen } from "../../../src/components/Screen";
import { createVisionItem } from "../../../src/features/vision/api";
import { VisionType } from "../../../src/types/domain";

const MAX_TITLE_LENGTH = 80;

export default function NewVisionScreen() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<VisionType>("SHORT_TERM");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkIssue, setNetworkIssue] = useState(false);

  const handleCreate = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    setSaving(true);
    setError(null);
    const { data, error: createError } = await createVisionItem({
      title: trimmedTitle,
      type,
      description: description.trim() ? description.trim() : undefined
    });

    if (createError || !data) {
      setError(createError?.message ?? "Unable to create vision item.");
      setNetworkIssue(true);
      setSaving(false);
      return;
    }

    setNetworkIssue(false);
    setSaving(false);
    router.replace(`/(tabs)/vision/${data.id}`);
  }, [description, title, type]);

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      {networkIssue ? (
        <Banner text="Connection issue - changes may not be saved." />
      ) : null}

      <Text style={styles.title}>New Vision</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Give this a name"
          maxLength={MAX_TITLE_LENGTH}
          style={styles.input}
        />
        <Text style={styles.helper}>
          {title.length}/{MAX_TITLE_LENGTH}
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.segmented}>
          <Pressable
            onPress={() => setType("SHORT_TERM")}
            style={[
              styles.segmentButton,
              type === "SHORT_TERM" && styles.segmentButtonActive
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                type === "SHORT_TERM" && styles.segmentTextActive
              ]}
            >
              Short term
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setType("LONG_TERM")}
            style={[
              styles.segmentButton,
              type === "LONG_TERM" && styles.segmentButtonActive
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                type === "LONG_TERM" && styles.segmentTextActive
              ]}
            >
              Long term
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional details"
          style={[styles.input, styles.textArea]}
          multiline
          textAlignVertical="top"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={handleCreate}
        style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Create</Text>
        )}
      </Pressable>
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
  textArea: {
    minHeight: 120
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
  error: {
    color: "#b00020"
  },
  primaryButton: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600"
  }
});
