import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type SectionCardProps = {
  title: string;
  children: ReactNode;
};

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f6f6f6",
    gap: 8
  },
  title: {
    fontSize: 16,
    fontWeight: "600"
  },
  content: {
    gap: 6
  }
});
