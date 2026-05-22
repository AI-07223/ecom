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
import { saveToken, sendOtp, verifyOtp } from "@/lib/api"

export default function LoginScreen() {
  const router = useRouter()
  const [step, setStep] = useState<"phone" | "code">("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleSendOtp(): Promise<void> {
    if (phone.length < 10) {
      Alert.alert("Enter a valid 10-digit phone number")
      return
    }
    setBusy(true)
    try {
      await sendOtp(`+91${phone}`)
      setStep("code")
    } catch (err) {
      Alert.alert("Couldn't send OTP", err instanceof Error ? err.message : "")
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(): Promise<void> {
    if (code.length !== 6) {
      Alert.alert("Enter the 6-digit code")
      return
    }
    setBusy(true)
    try {
      const result = await verifyOtp(`+91${phone}`, code)
      if (result.user.role !== "rider" && result.user.role !== "admin") {
        Alert.alert(
          "Not a rider",
          "This number isn't registered as a rider. Ask the admin to add you.",
        )
        setBusy(false)
        return
      }
      if (result.token) {
        await saveToken(result.token)
      }
      router.replace("/")
    } catch (err) {
      Alert.alert("Verification failed", err instanceof Error ? err.message : "")
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>HOTBOX</Text>
        <Text style={styles.subtitle}>Rider sign-in</Text>

        {step === "phone" ? (
          <>
            <Text style={styles.label}>Mobile number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                placeholder="98765 43210"
                placeholderTextColor="#a1a1aa"
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.button, (busy || phone.length < 10) && styles.disabled]}
              disabled={busy || phone.length < 10}
              onPress={handleSendOtp}
            >
              <Text style={styles.buttonText}>
                {busy ? "Sending…" : "Send OTP"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>6-digit code sent to +91 {phone}</Text>
            <TextInput
              style={styles.codeInput}
              keyboardType="number-pad"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor="#a1a1aa"
              autoFocus
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.button, (busy || code.length !== 6) && styles.disabled]}
              disabled={busy || code.length !== 6}
              onPress={handleVerify}
            >
              <Text style={styles.buttonText}>
                {busy ? "Verifying…" : "Verify & continue"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setStep("phone")
                setCode("")
              }}
            >
              <Text style={styles.muted}>Use a different number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fffaf6" },
  inner: { padding: 24, paddingTop: 60 },
  title: {
    fontSize: 56,
    fontWeight: "900",
    color: "#cf3a1f",
    letterSpacing: 2,
  },
  subtitle: { fontSize: 16, color: "#71717a", marginTop: 4, marginBottom: 32 },
  label: { fontSize: 13, color: "#3f3f46", marginBottom: 8 },
  phoneRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    overflow: "hidden",
    marginBottom: 16,
  },
  prefix: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#f4f4f5",
    borderRightWidth: 1,
    borderRightColor: "#e4e4e7",
    justifyContent: "center",
  },
  prefixText: { color: "#52525b", fontSize: 16 },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
  },
  codeInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    color: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    textAlign: "center",
    letterSpacing: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#cf3a1f",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  muted: {
    color: "#71717a",
    textAlign: "center",
    textDecorationLine: "underline",
  },
})
