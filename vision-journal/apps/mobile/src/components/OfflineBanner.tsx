import { StyleSheet, Text, View } from "react-native";

type OfflineBannerProps = {
  visible: boolean;
};

export function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You appear to be offline. Check your connection.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#fff4d6",
    borderColor: "#f0c36d",
    borderWidth: 1,
    padding: 10,
    borderRadius: 10
  },
  text: {
    color: "#6d4c0f",
    fontWeight: "600"
  }
});
