/**
 * API client that attaches the rider's session cookie/token to every
 * request. The web app uses an HttpOnly cookie set on hotbox.networkbase75
 * .site; in the native app we get the same JWT from the OTP-verify
 * response and store it in expo-secure-store, sending it as a Bearer
 * header.
 */
import * as SecureStore from "expo-secure-store"
import { BASE_URL } from "./config"

const TOKEN_KEY = "hotbox-rider-session"

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function loadToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
}

export async function api<T>(
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  const token = await loadToken()
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`${res.status}: ${text || res.statusText}`)
  }
  const ct = res.headers.get("content-type") ?? ""
  if (ct.includes("application/json")) return (await res.json()) as T
  return undefined as unknown as T
}

// ─── Typed helpers ───────────────────────────────────────────────────

export interface LoginResult {
  user: {
    id: string
    phone: string
    email: string | null
    name: string | null
    role: "customer" | "rider" | "admin"
  }
  token?: string
}

export async function login(
  identifier: string,
  password: string,
): Promise<LoginResult> {
  return api<LoginResult>("/api/auth/login", {
    method: "POST",
    body: { identifier, password, requestToken: true },
  })
}

export interface CurrentOrder {
  id: string
  publicCode: string
  state: string
  paymentMethod: "UPI_MANUAL" | "COD" | "ONLINE" | null
  paymentStatus: string
  pickup: { name: string; address: string; lat: number; lng: number }
  drop: {
    address: string
    building: string | null
    floor: string | null
    landmark: string | null
    lat: number | null
    lng: number | null
  }
  items: Array<{
    id: string
    title: string
    variantName: string | null
    quantity: number
  }>
  totalRupees: number
}

export async function getCurrentOrder(): Promise<CurrentOrder | null> {
  return api<CurrentOrder | null>("/api/rider/current-order")
}

export async function postRiderAction(
  orderId: string,
  action: "picked-up" | "out-for-delivery" | "delivered",
  body?: { cashCollected?: boolean },
): Promise<void> {
  await api(`/api/rider/order/${orderId}/${action}`, {
    method: "POST",
    ...(body ? { body } : {}),
  })
}

export async function postPing(opts: {
  lat: number
  lng: number
  accuracy_m?: number
  ts: string
}): Promise<void> {
  await api("/api/rider/ping", { method: "POST", body: opts })
}

export async function getLatestApkVersion(): Promise<{
  version: string
  apk_url: string
  changelog?: string
}> {
  return api("/api/rider/latest-version")
}
