import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";

export default function MonthlyScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Monthly</Text>
        <Text style={styles.body}>Monthly summaries will appear here.</Text>
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
