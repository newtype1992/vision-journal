import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Badge } from "../../../src/components/Badge";
import { Banner } from "../../../src/components/Banner";
import { Screen } from "../../../src/components/Screen";
import { listVisionItems } from "../../../src/features/vision/api";
import { VisionItem } from "../../../src/types/domain";

const getTypeLabel = (type: VisionItem["type"]) =>
  type === "SHORT_TERM" ? "Short term" : "Long term";

export default function VisionListScreen() {
  const [items, setItems] = useState<VisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listVisionItems();
    if (error) {
      setHasError(true);
      setLoading(false);
      return;
    }

    setItems(data ?? []);
    setHasError(false);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      {hasError ? (
        <Banner
          text="Connection issue - changes may not be saved."
          actionLabel="Retry"
          onAction={loadItems}
        />
      ) : null}

      <View style={styles.header}>
        <Text style={styles.title}>Vision</Text>
        <Pressable
          onPress={() => router.push("/(tabs)/vision/new")}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No vision items yet. Add one to define what you're working toward.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/vision/new")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Add Vision Item</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/(tabs)/vision/${item.id}`)}
              style={styles.card}
            >
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Badge label={getTypeLabel(item.type)} />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16
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
  addButton: {
    backgroundColor: "#111",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  loading: {
    paddingVertical: 24,
    alignItems: "center"
  },
  list: {
    gap: 12
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f6f6f6",
    gap: 8
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  emptyState: {
    paddingVertical: 16,
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
