import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";

export default function ProgressScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.body}>Graphs and streaks will appear here.</Text>
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
    fontSize: 28,
    fontWeight: "700"
  },
  body: {
    color: "#4d4d4d"
  }
});
