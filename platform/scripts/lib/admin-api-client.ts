/**
 * Minimal typed client for Medusa v2's admin REST API.
 *
 * Used by provisioning scripts (seed, tenant-create, future onboarding).
 * Keeps a single Bearer JWT in memory, transparently re-authenticates on
 * expiry, and exposes only the endpoints we actually need.
 *
 * NOT to be used from the storefront — those go through `lib/commerce.ts`.
 */

const DEFAULT_TOKEN_TTL_MS = 14 * 60 * 1000 // 14m — refresh just before Medusa's 15m expiry

export interface AdminApiClientOptions {
  baseUrl: string
  email: string
  password: string
  tokenTtlMs?: number
  fetchImpl?: typeof fetch
}

export interface AdminSalesChannel {
  id: string
  name: string
  description: string | null
  is_disabled: boolean
}

export interface AdminPublishableApiKey {
  id: string
  title: string
  token: string
  created_at: string
  revoked_at: string | null
}

export interface AdminRegion {
  id: string
  name: string
  currency_code: string
}

export interface AdminProduct {
  id: string
  handle: string
  title: string
  description: string | null
  sales_channels?: { id: string; name: string }[]
}

interface ProductVariantInput {
  title: string
  prices: { currency_code: string; amount: number }[]
  manage_inventory?: boolean
}

interface CreateProductInput {
  title: string
  handle: string
  description: string
  status: "published" | "draft"
  sales_channels: { id: string }[]
  options?: { title: string; values: string[] }[]
  variants?: ProductVariantInput[]
}

interface ListResult<T> {
  items: T[]
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message)
    this.name = "AdminApiError"
  }
}

export class AdminApiClient {
  private token: string | null = null
  private tokenExpiresAt = 0
  private readonly fetchImpl: typeof fetch
  private readonly ttl: number

  constructor(private readonly options: AdminApiClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch
    this.ttl = options.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS
  }

  /** Force re-auth (mostly used by tests). */
  invalidateToken(): void {
    this.token = null
    this.tokenExpiresAt = 0
  }

  /** Acquire (or refresh) an admin Bearer token. */
  private async ensureToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token

    const res = await this.fetchImpl(
      `${this.options.baseUrl}/auth/user/emailpass`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: this.options.email,
          password: this.options.password,
        }),
      },
    )
    if (!res.ok) {
      const body = await safeJson(res)
      throw new AdminApiError(
        `admin auth failed: ${res.status}`,
        res.status,
        body,
      )
    }
    const { token } = (await res.json()) as { token: string }
    this.token = token
    this.tokenExpiresAt = Date.now() + this.ttl
    return token
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    // One retry on 401: token may have expired between cache check and call.
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.ensureToken()
      const headers = new Headers(init.headers)
      headers.set("authorization", `Bearer ${token}`)
      if (init.body && !headers.has("content-type")) {
        headers.set("content-type", "application/json")
      }
      const res = await this.fetchImpl(`${this.options.baseUrl}${path}`, {
        ...init,
        headers,
      })
      if (res.status === 401 && attempt === 0) {
        this.invalidateToken()
        continue
      }
      if (!res.ok) {
        const body = await safeJson(res)
        throw new AdminApiError(
          `${init.method ?? "GET"} ${path} → ${res.status}`,
          res.status,
          body,
        )
      }
      if (res.status === 204) return undefined as T
      return (await res.json()) as T
    }
    /* istanbul ignore next */
    throw new Error("unreachable")
  }

  // ─── Sales channels ────────────────────────────────────────────────────

  async listSalesChannels(): Promise<AdminSalesChannel[]> {
    const { sales_channels } = await this.request<{
      sales_channels: AdminSalesChannel[]
    }>(`/admin/sales-channels?limit=200`)
    return sales_channels
  }

  async findSalesChannelByName(
    name: string,
  ): Promise<AdminSalesChannel | null> {
    const all = await this.listSalesChannels()
    return all.find((c) => c.name === name) ?? null
  }

  async createSalesChannel(input: {
    name: string
    description?: string
  }): Promise<AdminSalesChannel> {
    const { sales_channel } = await this.request<{
      sales_channel: AdminSalesChannel
    }>(`/admin/sales-channels`, {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        description: input.description ?? "",
      }),
    })
    return sales_channel
  }

  // ─── Publishable API keys ──────────────────────────────────────────────

  async listPublishableApiKeys(): Promise<AdminPublishableApiKey[]> {
    const { api_keys } = await this.request<{
      api_keys: AdminPublishableApiKey[]
    }>(`/admin/api-keys?type=publishable&limit=200`)
    return api_keys
  }

  async findPublishableApiKeyByTitle(
    title: string,
  ): Promise<AdminPublishableApiKey | null> {
    const all = await this.listPublishableApiKeys()
    return all.find((k) => k.title === title) ?? null
  }

  async createPublishableApiKey(title: string): Promise<AdminPublishableApiKey> {
    const { api_key } = await this.request<{
      api_key: AdminPublishableApiKey
    }>(`/admin/api-keys`, {
      method: "POST",
      body: JSON.stringify({ title, type: "publishable" }),
    })
    return api_key
  }

  async addSalesChannelToKey(
    apiKeyId: string,
    salesChannelId: string,
  ): Promise<void> {
    await this.request(
      `/admin/api-keys/${apiKeyId}/sales-channels`,
      {
        method: "POST",
        body: JSON.stringify({ add: [salesChannelId] }),
      },
    )
  }

  async listApiKeySalesChannels(apiKeyId: string): Promise<string[]> {
    const { api_key } = await this.request<{
      api_key: { sales_channels?: { id: string }[] }
    }>(`/admin/api-keys/${apiKeyId}?fields=sales_channels.id`)
    return (api_key.sales_channels ?? []).map((sc) => sc.id)
  }

  // ─── Regions ────────────────────────────────────────────────────────────

  async listRegions(): Promise<AdminRegion[]> {
    const { regions } = await this.request<{ regions: AdminRegion[] }>(
      `/admin/regions?limit=50`,
    )
    return regions
  }

  async findRegionByCurrency(
    currencyCode: string,
  ): Promise<AdminRegion | null> {
    const all = await this.listRegions()
    return all.find((r) => r.currency_code === currencyCode.toLowerCase()) ?? null
  }

  async createRegion(input: {
    name: string
    currency_code: string
    countries: string[]
  }): Promise<AdminRegion> {
    const { region } = await this.request<{ region: AdminRegion }>(
      `/admin/regions`,
      {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          currency_code: input.currency_code,
          countries: input.countries,
        }),
      },
    )
    return region
  }

  // ─── Products ───────────────────────────────────────────────────────────

  async listProductsByHandle(handle: string): Promise<AdminProduct[]> {
    const { products } = await this.request<{ products: AdminProduct[] }>(
      `/admin/products?handle=${encodeURIComponent(handle)}&fields=*sales_channels`,
    )
    return products
  }

  async createProduct(input: CreateProductInput): Promise<AdminProduct> {
    const { product } = await this.request<{ product: AdminProduct }>(
      `/admin/products`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    )
    return product
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    try {
      return await res.text()
    } catch {
      return undefined
    }
  }
}
