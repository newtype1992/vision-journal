import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/Screen";

export default function NewHabitScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Add Habit</Text>
        <Text style={styles.body}>Habit creation is coming soon.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12
  },
  title: {
    fontSize: 24,
    fontWeight: "700"
  },
  body: {
    color: "#4d4d4d"
  }
});
