import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Screen } from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabaseClient";
import { useAuth } from "../../src/state/auth";

export default function SettingsScreen() {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setError(null);
    setLoading(true);

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
    }

    setLoading(false);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{user?.email ?? "Unknown"}</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={handleSignOut} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign out</Text>
          )}
        </Pressable>
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
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f3f3f3",
    gap: 6
  },
  label: {
    color: "#5e5e5e"
  },
  value: {
    fontSize: 16,
    fontWeight: "600"
  },
  error: {
    color: "#b00020"
  },
  button: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600"
  }
});
