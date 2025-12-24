import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { SectionCard } from "../../src/components/SectionCard";

export default function TodayScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Today</Text>

        <SectionCard title="Journal">
          <Text style={styles.body}>Write a quick reflection for today.</Text>
        </SectionCard>

        <SectionCard title="Habits">
          <Text style={styles.body}>Log your daily habits and streaks.</Text>
        </SectionCard>
      </View>
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
  body: {
    color: "#4d4d4d"
  }
});
