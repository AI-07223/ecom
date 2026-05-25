import * as Device from "expo-device"
import { useRouter } from "expo-router"
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { brand } from "@/lib/brand"

const TIPS: Record<string, string[]> = {
  Xiaomi: [
    "Settings → Apps → Manage Apps → Hot Box Rider",
    "  → Battery saver → No restrictions",
    "  → Autostart → On",
    "  → Other permissions → Display pop-up while running in background → Allow",
  ],
  Redmi: [
    "Settings → Apps → Manage Apps → Hot Box Rider",
    "  → Battery saver → No restrictions",
    "  → Autostart → On",
  ],
  Poco: [
    "Settings → Apps → Manage Apps → Hot Box Rider",
    "  → Battery saver → No restrictions",
    "  → Autostart → On",
  ],
  OPPO: [
    "Settings → Apps → Hot Box Rider",
    "  → Battery → Allow background activity",
    "  → Battery → Background freeze → Off",
  ],
  Realme: [
    "Settings → Apps → Hot Box Rider",
    "  → Battery → Allow background activity",
    "  → Battery → Background freeze → Off",
  ],
  Vivo: [
    "Settings → Battery → High background app limit → Hot Box Rider → Allow",
    "Settings → Apps → Hot Box Rider → Permissions → Background pop-up → Allow",
  ],
  iQOO: [
    "Settings → Battery → High background app limit → Hot Box Rider → Allow",
  ],
  OnePlus: [
    "Usually works out of the box. If GPS stops mid-delivery:",
    "Settings → Battery → Battery optimization → Hot Box Rider → Don't optimize",
  ],
  samsung: [
    "Usually works out of the box. If GPS stops mid-delivery:",
    "Settings → Apps → Hot Box Rider → Battery → Unrestricted",
  ],
}

export default function SetupScreen() {
  const router = useRouter()
  const manufacturer = (Device.manufacturer ?? "").trim()
  const matchedKey = Object.keys(TIPS).find((k) =>
    manufacturer.toLowerCase().includes(k.toLowerCase()),
  )
  const tips = matchedKey ? TIPS[matchedKey] : null

  return (
    <ScrollView
      style={{ backgroundColor: brand.shellBg }}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>One-time setup</Text>
      <Text style={styles.body}>
        Hot Box Rider tracks your location during deliveries so the customer
        sees where you are. To keep tracking running when your screen is off,
        your phone needs to allow Hot Box Rider in the background.
      </Text>

      {tips ? (
        <>
          <Text style={styles.section}>On your {matchedKey} phone:</Text>
          {tips.map((line, idx) => (
            <Text key={idx} style={styles.tipLine}>
              {line}
            </Text>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.section}>General Android tips:</Text>
          <Text style={styles.tipLine}>
            Settings → Apps → Hot Box Rider → Battery → Don&rsquo;t restrict
          </Text>
          <Text style={styles.tipLine}>
            Settings → Apps → Hot Box Rider → Permissions → Location → Allow
            all the time
          </Text>
        </>
      )}

      <View style={styles.section2}>
        <Text style={styles.body}>
          You&rsquo;ll see a persistent notification saying &ldquo;Hot Box
          Rider — tracking&rdquo; when a delivery is active. Don&rsquo;t
          swipe it away — that&rsquo;s what keeps the GPS running.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/")}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: brand.shellFg,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  body: { fontSize: 15, color: brand.charcoalStrong, lineHeight: 22 },
  section: {
    fontSize: 13,
    color: brand.yellow,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
  },
  section2: { marginTop: 24 },
  tipLine: {
    fontSize: 14,
    color: brand.shellFg,
    marginVertical: 2,
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: brand.yellow,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 32,
  },
  buttonText: {
    color: brand.shellBg,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
})
