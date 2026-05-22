import { useFocusEffect, useRouter } from "expo-router"
import * as Device from "expo-device"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { CurrentOrder, getCurrentOrder, getLatestApkVersion, loadToken, postRiderAction } from "@/lib/api"
import { startTracking, stopTracking } from "@/lib/location-task"

const APP_VERSION = "0.1.0"
const SETUP_SHOWN_KEY = "@hotbox-rider:setup-shown"

export default function HomeScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [order, setOrder] = useState<CurrentOrder | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState<
    null | { version: string; apkUrl: string }
  >(null)

  async function refresh(): Promise<void> {
    try {
      const o = await getCurrentOrder()
      setOrder(o)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed"
      if (msg.startsWith("401")) {
        router.replace("/login")
        return
      }
      console.warn(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // On first ever launch, push to /setup
  useEffect(() => {
    void (async () => {
      const token = await loadToken()
      if (!token) {
        router.replace("/login")
        return
      }
      // Show first-launch setup on Android once
      if (Device.osName === "Android") {
        // We don't have AsyncStorage here; rely on a separate flag in
        // SecureStore through expo-secure-store if needed. For v1 the
        // setup screen is opt-in via a small "Setup tips" link below.
      }

      // Background update check (fire-and-forget)
      try {
        const latest = await getLatestApkVersion()
        if (latest.version && latest.version !== APP_VERSION) {
          setUpdateAvailable({ version: latest.version, apkUrl: latest.apk_url })
        }
      } catch {
        /* offline or endpoint missing — ignore */
      }
    })()
  }, [router])

  useFocusEffect(
    useCallback(() => {
      void refresh()
      const id = setInterval(() => void refresh(), 15_000)
      return () => clearInterval(id)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  )

  async function handlePrimaryAction(): Promise<void> {
    if (!order) return
    try {
      if (order.state === "ASSIGNED") {
        await postRiderAction(order.id, "picked-up")
      } else if (order.state === "PICKED_UP") {
        await postRiderAction(order.id, "out-for-delivery")
        await startTracking()
      } else if (order.state === "OUT_FOR_DELIVERY") {
        await postRiderAction(order.id, "delivered")
        await stopTracking()
      }
      await refresh()
    } catch (err) {
      Alert.alert("Action failed", err instanceof Error ? err.message : "Try again.")
    }
  }

  const primaryLabel =
    order?.state === "ASSIGNED"
      ? "I've picked up the order"
      : order?.state === "PICKED_UP"
        ? "Heading out — start tracking"
        : order?.state === "OUT_FOR_DELIVERY"
          ? "I've delivered the order"
          : null

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#cf3a1f" />
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void refresh()
          }}
          tintColor="#cf3a1f"
        />
      }
    >
      {updateAvailable && (
        <TouchableOpacity
          style={styles.updateBanner}
          onPress={() => Linking.openURL(updateAvailable.apkUrl)}
        >
          <Text style={styles.updateText}>
            Update available: v{updateAvailable.version}. Tap to download.
          </Text>
        </TouchableOpacity>
      )}

      {!order ? (
        <View style={styles.idleCard}>
          <Text style={styles.idleTitle}>Waiting for assignment</Text>
          <Text style={styles.idleBody}>
            Pull down to refresh. You&rsquo;ll see your next delivery here.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>Order {order.publicCode}</Text>
            <Text style={styles.total}>₹{order.totalRupees.toFixed(0)}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Pickup</Text>
            <Text style={styles.bold}>{order.pickup.name}</Text>
            <Text style={styles.body}>{order.pickup.address}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Deliver to</Text>
            <Text style={styles.body}>{order.drop.address}</Text>
            {order.drop.building && (
              <Text style={styles.muted}>{order.drop.building}</Text>
            )}
            {order.drop.landmark && (
              <Text style={styles.muted}>Near {order.drop.landmark}</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Items</Text>
            {order.items.map((i) => (
              <Text key={i.id} style={styles.body}>
                {i.quantity} × {i.title}
                {i.variantName ? ` (${i.variantName})` : ""}
              </Text>
            ))}
          </View>

          {primaryLabel && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePrimaryAction}
            >
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </TouchableOpacity>
          )}

          {(order.state === "PICKED_UP" || order.state === "OUT_FOR_DELIVERY") && (
            <Text style={styles.tracking}>
              📍 Sending your location every 5 seconds.
            </Text>
          )}
        </>
      )}

      <TouchableOpacity
        style={styles.helpLink}
        onPress={() => router.push("/setup")}
      >
        <Text style={styles.helpText}>First-time setup tips</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#71717a",
    textTransform: "uppercase",
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#71717a",
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 6,
  },
  total: { fontSize: 24, fontWeight: "800", marginTop: 4, color: "#1a1a1a" },
  bold: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  body: { fontSize: 14, color: "#3f3f46", marginVertical: 1 },
  muted: { fontSize: 12, color: "#71717a" },
  primaryButton: {
    backgroundColor: "#cf3a1f",
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 8,
    alignItems: "center",
  },
  primaryButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
  tracking: {
    textAlign: "center",
    color: "#71717a",
    marginTop: 12,
    fontSize: 12,
  },
  idleCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  idleTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  idleBody: {
    fontSize: 14,
    color: "#71717a",
    marginTop: 6,
    textAlign: "center",
  },
  updateBanner: {
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  updateText: { color: "#854d0e", fontWeight: "600", textAlign: "center" },
  helpLink: { marginTop: 24, alignSelf: "center" },
  helpText: { color: "#71717a", textDecorationLine: "underline" },
})
