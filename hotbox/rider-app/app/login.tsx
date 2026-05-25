import { useRouter } from "expo-router"
import { useState } from "react"
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { brand } from "@/lib/brand"
import { login, saveToken } from "@/lib/api"

export default function LoginScreen() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleLogin(): Promise<void> {
    if (identifier.trim().length < 3 || password.length < 1) return
    setBusy(true)
    try {
      const result = await login(identifier.trim(), password)
      if (result.user.role !== "rider" && result.user.role !== "admin") {
        Alert.alert(
          "Not a rider",
          "This account isn't registered as a rider. Ask the admin to add you to the rider roster.",
        )
        setBusy(false)
        return
      }
      if (!result.token) {
        Alert.alert(
          "Sign-in failed",
          "Server didn't return a session token. Try again.",
        )
        setBusy(false)
        return
      }
      await saveToken(result.token)
      router.replace("/")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Try again."
      Alert.alert(
        "Sign-in failed",
        msg.startsWith("401") ? "Wrong email/phone or password" : msg,
      )
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = identifier.trim().length >= 3 && password.length >= 1

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>HOT BOX</Text>
        <Text style={styles.subtitle}>Rider sign-in</Text>

        <Text style={styles.label}>Email or phone</Text>
        <TextInput
          style={styles.input}
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="you@example.com or 98765 43210"
          placeholderTextColor={brand.charcoal}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoFocus
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={brand.charcoal}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.disabled]}
          disabled={busy || !canSubmit}
          onPress={handleLogin}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {busy ? "Signing in…" : "Sign in"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.help}>
          Don&rsquo;t have an account? Ask the admin to add your phone to the
          rider roster, then sign up at hotbox.networkbase75.site.
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.shellBg },
  inner: { padding: 24, paddingTop: 80 },
  title: {
    fontSize: 56,
    fontWeight: "900",
    color: brand.yellow,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: brand.charcoalStrong,
    marginTop: 4,
    marginBottom: 36,
  },
  label: {
    fontSize: 11,
    color: brand.charcoal,
    marginBottom: 6,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: brand.shellFg,
    backgroundColor: brand.shellElev,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.shellLine,
    marginBottom: 16,
  },
  button: {
    backgroundColor: brand.yellow,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  buttonText: {
    color: brand.shellBg,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  disabled: { opacity: 0.5 },
  help: {
    color: brand.charcoal,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
})
