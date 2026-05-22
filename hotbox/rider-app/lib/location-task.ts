/**
 * Foreground location task. Defined once at app start (in app/_layout.tsx)
 * and started/stopped when the rider taps "picked up" / "delivered".
 *
 * Why this file is module-scope: expo-task-manager requires the task to
 * be registered at the JS layer BEFORE the native runtime is reused for a
 * background trigger. Importing this file from _layout.tsx is sufficient.
 */
import * as Location from "expo-location"
import * as TaskManager from "expo-task-manager"
import { FOREGROUND_LOCATION_TASK, PING_INTERVAL_MS } from "./config"
import { postPing } from "./api"

interface LocationTaskData {
  locations: Location.LocationObject[]
}

let lastPingAt = 0

TaskManager.defineTask(
  FOREGROUND_LOCATION_TASK,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<LocationTaskData>) => {
    if (error) {
      console.warn("[location-task] error:", error)
      return
    }
    const loc = data?.locations?.[0]
    if (!loc) return

    const now = Date.now()
    if (now - lastPingAt < PING_INTERVAL_MS - 500) return
    lastPingAt = now

    try {
      await postPing({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy_m: loc.coords.accuracy ?? undefined,
        ts: new Date(loc.timestamp).toISOString(),
      })
    } catch (err) {
      // Swallow network errors — the foreground service should keep running
      // even if a few pings fail to deliver.
      console.warn("[location-task] ping failed:", err)
    }
  },
)

export async function startTracking(): Promise<void> {
  const { status: foreground } =
    await Location.requestForegroundPermissionsAsync()
  if (foreground !== "granted") {
    throw new Error("Foreground location permission required")
  }
  const { status: background } =
    await Location.requestBackgroundPermissionsAsync()
  if (background !== "granted") {
    // We can run with foreground-only — the foreground service via
    // notification keeps it active during screen lock on most devices.
    console.warn(
      "[location-task] background permission denied; foreground-service only",
    )
  }

  const already = await Location.hasStartedLocationUpdatesAsync(
    FOREGROUND_LOCATION_TASK,
  )
  if (already) return

  await Location.startLocationUpdatesAsync(FOREGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: PING_INTERVAL_MS,
    distanceInterval: 10,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Hotbox Rider — tracking",
      notificationBody: "Your delivery is being shared with the customer.",
      notificationColor: "#cf3a1f",
    },
    pausesUpdatesAutomatically: false,
  })
}

export async function stopTracking(): Promise<void> {
  const running = await Location.hasStartedLocationUpdatesAsync(
    FOREGROUND_LOCATION_TASK,
  )
  if (running)
    await Location.stopLocationUpdatesAsync(FOREGROUND_LOCATION_TASK)
}
