import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/Screen";
import { SectionCard } from "../../src/components/SectionCard";

export default function VisionScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Vision</Text>
        <SectionCard title="Your vision items">
          <Text style={styles.body}>Add future goals and map them to habits.</Text>
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
