import { Pressable, StyleSheet, Text, View } from "react-native";

type BannerProps = {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function Banner({ text, actionLabel, onAction }: BannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{text}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 10,
    backgroundColor: "#fff4d6",
    borderWidth: 1,
    borderColor: "#f0c36d",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  text: {
    color: "#5c3d00",
    fontWeight: "600",
    flex: 1
  },
  action: {
    color: "#1a4fd7",
    fontWeight: "600",
    marginLeft: 12
  }
});
