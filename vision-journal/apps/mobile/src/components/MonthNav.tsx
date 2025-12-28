import { Pressable, StyleSheet, Text, View } from "react-native";

type MonthNavProps = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  disableNext?: boolean;
};

export function MonthNav({ label, onPrev, onNext, disableNext }: MonthNavProps) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onPrev} style={styles.arrowButton}>
        <Text style={styles.arrowText}>{"<"}</Text>
      </Pressable>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={disableNext ? undefined : onNext}
        style={styles.arrowButton}
        disabled={disableNext}
      >
        <Text style={[styles.arrowText, disableNext && styles.arrowTextDisabled]}>
          {">"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  arrowButton: {
    width: 36,
    alignItems: "center"
  },
  arrowText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222"
  },
  arrowTextDisabled: {
    color: "#b0b0b0"
  },
  label: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600"
  }
});
