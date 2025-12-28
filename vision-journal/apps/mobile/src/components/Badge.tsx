import { StyleSheet, Text, View } from "react-native";

type BadgeProps = {
  label: string;
};

export function Badge({ label }: BadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e8e8e8"
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444"
  }
});
