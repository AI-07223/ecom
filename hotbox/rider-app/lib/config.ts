/**
 * Centralized config for the rider app.
 * BASE_URL is hardcoded for the demo deployment; for staging/preview
 * builds, this would come from `expo-constants` extra section.
 */
export const BASE_URL = "https://hotbox.networkbase75.site"

export const PING_INTERVAL_MS = 5_000

export const FOREGROUND_LOCATION_TASK = "hotbox-rider-location-task"
