import { useFocusEffect, useRouter } from "expo-router"
import * as Device from "expo-device"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import {
  CurrentOrder,
  getCurrentOrder,
  getLatestApkVersion,
  loadToken,
  postRiderAction,
} from "@/lib/api"
import { brand } from "@/lib/brand"
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
  const [showCodModal, setShowCodModal] = useState(false)

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

  // On first ever launch, redirect to login if no token.
  useEffect(() => {
    void (async () => {
      const token = await loadToken()
      if (!token) {
        router.replace("/login")
        return
      }
      if (Device.osName === "Android") {
        // First-launch setup is opt-in via the "Setup tips" link below.
      }

      // Background update check (fire-and-forget)
      try {
        const latest = await getLatestApkVersion()
        if (latest.version && latest.version !== APP_VERSION) {
          setUpdateAvailable({
            version: latest.version,
            apkUrl: latest.apk_url,
          })
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
        // COD: prompt to confirm cash collection before marking delivered.
        if (order.paymentMethod === "COD" && order.paymentStatus !== "PAID") {
          setShowCodModal(true)
          return
        }
        await postRiderAction(order.id, "delivered", { cashCollected: false })
        await stopTracking()
      }
      await refresh()
    } catch (err) {
      Alert.alert(
        "Action failed",
        err instanceof Error ? err.message : "Try again.",
      )
    }
  }

  async function confirmCash(yes: boolean): Promise<void> {
    if (!order) return
    setShowCodModal(false)
    try {
      await postRiderAction(order.id, "delivered", { cashCollected: yes })
      await stopTracking()
      await refresh()
    } catch (err) {
      Alert.alert(
        "Action failed",
        err instanceof Error ? err.message : "Try again.",
      )
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

  const isCod =
    order?.paymentMethod === "COD" && order?.paymentStatus !== "PAID"

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={brand.yellow} />
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: brand.shellBg }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void refresh()
          }}
          tintColor={brand.yellow}
          colors={[brand.yellow]}
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
          {isCod && (
            <View style={styles.codBanner}>
              <Text style={styles.codBannerKicker}>⚠ COLLECT CASH</Text>
              <Text style={styles.codBannerAmount}>
                ₹{order.totalRupees.toFixed(0)}
              </Text>
            </View>
          )}

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
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </TouchableOpacity>
          )}

          {(order.state === "PICKED_UP" ||
            order.state === "OUT_FOR_DELIVERY") && (
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

      {/* COD cash-collection confirmation modal */}
      <Modal
        animationType="slide"
        transparent
        visible={showCodModal}
        onRequestClose={() => setShowCodModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Did the customer pay cash?</Text>
            <Text style={styles.modalSubtitle}>
              Order {order?.publicCode} · ₹{order?.totalRupees.toFixed(0)}
            </Text>
            <TouchableOpacity
              style={styles.modalPrimary}
              onPress={() => void confirmCash(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalPrimaryText}>
                ✓ Yes — ₹{order?.totalRupees.toFixed(0)} received
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalDanger}
              onPress={() => void confirmCash(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDangerText}>
                No — flag for admin follow-up
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowCodModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: brand.shellBg,
  },
  card: {
    backgroundColor: brand.shellElev,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: brand.shellLine,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: brand.charcoal,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: brand.charcoal,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 6,
  },
  total: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
    color: brand.yellow,
  },
  bold: { fontSize: 16, fontWeight: "700", color: brand.shellFg },
  body: { fontSize: 14, color: brand.charcoalStrong, marginVertical: 1 },
  muted: { fontSize: 12, color: brand.charcoal },
  primaryButton: {
    backgroundColor: brand.yellow,
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 8,
    alignItems: "center",
  },
  primaryButtonText: {
    color: brand.shellBg,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  tracking: {
    textAlign: "center",
    color: brand.charcoal,
    marginTop: 12,
    fontSize: 12,
  },
  idleCard: {
    backgroundColor: brand.shellElev,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: brand.shellLine,
  },
  idleTitle: { fontSize: 18, fontWeight: "700", color: brand.shellFg },
  idleBody: {
    fontSize: 14,
    color: brand.charcoal,
    marginTop: 6,
    textAlign: "center",
  },
  updateBanner: {
    backgroundColor: brand.flameDark,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: brand.flameDeep,
  },
  updateText: { color: brand.flameText, fontWeight: "600", textAlign: "center" },
  codBanner: {
    backgroundColor: brand.yellow,
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
  },
  codBannerKicker: {
    color: brand.shellBg,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  codBannerAmount: {
    color: brand.shellBg,
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 50,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  helpLink: { marginTop: 24, alignSelf: "center" },
  helpText: { color: brand.charcoal, textDecorationLine: "underline" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: brand.shellElev,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: brand.shellLine,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: brand.shellFg,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: brand.charcoalStrong,
    marginBottom: 20,
  },
  modalPrimary: {
    backgroundColor: brand.yellow,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  modalPrimaryText: {
    color: brand.shellBg,
    fontWeight: "800",
    fontSize: 16,
  },
  modalDanger: {
    backgroundColor: brand.flameDark,
    borderWidth: 1,
    borderColor: brand.flameDeep,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalDangerText: {
    color: brand.flameText,
    fontWeight: "600",
    fontSize: 14,
  },
  modalCancel: { paddingVertical: 14, alignItems: "center", marginTop: 4 },
  modalCancelText: { color: brand.charcoal, fontSize: 14 },
})
