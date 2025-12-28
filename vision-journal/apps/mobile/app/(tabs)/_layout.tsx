import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="today"
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: { paddingBottom: 6, paddingTop: 6, height: 58 }
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Today" }} />
      <Tabs.Screen name="vision" options={{ title: "Vision" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
      <Tabs.Screen name="monthly" options={{ title: "Monthly" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      <Tabs.Screen
        name="habits/new"
        options={{ title: "Add Habit", href: null }}
      />
    </Tabs>
  );
}

