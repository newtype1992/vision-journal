import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { LoadingScreen } from "../src/components/LoadingScreen";
import { AuthProvider, useAuth } from "../src/state/auth";

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (session && inAuthGroup) {
      router.replace("/(tabs)/today");
    }
  }, [loading, router, segments, session]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
