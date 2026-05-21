import { describe, expect, it, vi, afterEach } from "vitest"
import { AdminApiClient } from "./admin-api-client.js"

afterEach(() => {
  vi.restoreAllMocks()
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

describe("AdminApiClient", () => {
  it("caches the token across calls within TTL", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/user/emailpass")) return jsonResponse({ token: "tok-1" })
      return jsonResponse({ sales_channels: [] })
    }) as unknown as typeof fetch

    const client = new AdminApiClient({
      baseUrl: "http://medusa",
      email: "admin@x",
      password: "p",
      fetchImpl,
    })

    await client.listSalesChannels()
    await client.listSalesChannels()

    const authCalls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(
      ([url]) => String(url).endsWith("/auth/user/emailpass"),
    )
    expect(authCalls).toHaveLength(1)
  })

  it("re-authenticates after TTL expires", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/user/emailpass")) return jsonResponse({ token: "tok-x" })
      return jsonResponse({ sales_channels: [] })
    }) as unknown as typeof fetch

    const client = new AdminApiClient({
      baseUrl: "http://medusa",
      email: "admin@x",
      password: "p",
      tokenTtlMs: 10,
      fetchImpl,
    })

    await client.listSalesChannels()
    await new Promise((r) => setTimeout(r, 15))
    await client.listSalesChannels()

    const authCalls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(
      ([url]) => String(url).endsWith("/auth/user/emailpass"),
    )
    expect(authCalls).toHaveLength(2)
  })

  it("retries once on a 401 after invalidating the cached token", async () => {
    let salesChannelCallCount = 0
    let authCallCount = 0
    const fetchImpl = vi.fn(async (url: string) => {
      const u = String(url)
      if (u.endsWith("/auth/user/emailpass")) {
        authCallCount++
        return jsonResponse({ token: `tok-${authCallCount}` })
      }
      if (u.includes("/admin/sales-channels")) {
        salesChannelCallCount++
        if (salesChannelCallCount === 1) {
          return jsonResponse({ message: "unauthorized" }, 401)
        }
        return jsonResponse({ sales_channels: [] })
      }
      throw new Error(`unexpected url ${u}`)
    }) as unknown as typeof fetch

    const client = new AdminApiClient({
      baseUrl: "http://medusa",
      email: "admin@x",
      password: "p",
      fetchImpl,
    })

    const channels = await client.listSalesChannels()
    expect(channels).toEqual([])
    expect(authCallCount).toBe(2) // initial + re-auth after 401
    expect(salesChannelCallCount).toBe(2) // initial 401 + retry
  })

  it("surfaces non-401 errors as AdminApiError with body", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).endsWith("/auth/user/emailpass")) return jsonResponse({ token: "t" })
      return jsonResponse({ message: "bad input" }, 400)
    }) as unknown as typeof fetch

    const client = new AdminApiClient({
      baseUrl: "http://medusa",
      email: "admin@x",
      password: "p",
      fetchImpl,
    })

    await expect(client.listSalesChannels()).rejects.toMatchObject({
      name: "AdminApiError",
      status: 400,
    })
  })

  it("findSalesChannelByName returns null when not present", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).endsWith("/auth/user/emailpass")) return jsonResponse({ token: "t" })
      return jsonResponse({
        sales_channels: [
          { id: "sc_1", name: "Default", description: null, is_disabled: false },
        ],
      })
    }) as unknown as typeof fetch

    const client = new AdminApiClient({
      baseUrl: "http://medusa",
      email: "admin@x",
      password: "p",
      fetchImpl,
    })

    const acme = await client.findSalesChannelByName("Acme")
    expect(acme).toBeNull()
    const def = await client.findSalesChannelByName("Default")
    expect(def?.id).toBe("sc_1")
  })
})
