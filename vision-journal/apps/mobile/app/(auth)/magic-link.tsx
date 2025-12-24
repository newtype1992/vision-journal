import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { OfflineBanner } from "../../src/components/OfflineBanner";
import { Screen } from "../../src/components/Screen";
import { isNetworkError } from "../../src/lib/errors";
import { supabase } from "../../src/lib/supabaseClient";

export default function MagicLinkScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && !loading;

  const handleMagicLink = async () => {
    setError(null);
    setOffline(false);
    setLoading(true);

    const { error: magicError } = await supabase.auth.signInWithOtp({
      email: email.trim()
    });

    if (magicError) {
      setError(magicError.message);
      setOffline(isNetworkError(magicError));
      setSent(false);
    } else {
      setSent(true);
    }

    setLoading(false);
  };

  return (
    <Screen scroll contentContainerStyle={styles.container}>
      <OfflineBanner visible={offline} />

      <Text style={styles.title}>Magic link</Text>
      <Text style={styles.subtitle}>We will email you a sign-in link.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
        />
      </View>

      {sent ? <Text style={styles.success}>Check your email for the link.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleMagicLink}
        disabled={!canSubmit}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send magic link</Text>
        )}
      </Pressable>

      <View style={styles.links}>
        <Link href="/(auth)/sign-in" style={styles.linkText}>
          Back to sign in
        </Link>
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
  subtitle: {
    color: "#5e5e5e"
  },
  field: {
    gap: 8
  },
  label: {
    fontSize: 14,
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  success: {
    color: "#146c2e",
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
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600"
  },
  links: {
    gap: 10
  },
  linkText: {
    color: "#2b5bff",
    fontWeight: "600"
  }
});
