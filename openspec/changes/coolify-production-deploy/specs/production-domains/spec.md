## ADDED Requirements

### Requirement: Production domains are TLS-secured by Let's Encrypt
Each public-facing Coolify application SHALL serve over HTTPS with a Let's Encrypt certificate issued automatically by Coolify's Traefik proxy. HTTP traffic SHALL redirect to HTTPS.

#### Scenario: Medusa admin is HTTPS-only
- **WHEN** the operator opens `http://medusa.networkbase75.site/app` in a browser
- **THEN** the response is a 301/302 to the `https://` equivalent and the HTTPS endpoint serves with a valid certificate

#### Scenario: Both tenant storefronts share a single application with multi-domain TLS
- **WHEN** the operator opens `https://acme.networkbase75.site` and `https://globex.networkbase75.site`
- **THEN** both URLs serve a valid certificate (matching each FQDN), both are routed to the same storefront container, and the storefront's proxy.ts resolves each Host to its own tenant row

### Requirement: Health endpoints return 200 on healthy containers
The Medusa application SHALL expose `GET /health` and the storefront SHALL expose `GET /api/health`. Both SHALL return HTTP 200 with a JSON body containing `{ "status": "ok" }` when the underlying server is running.

#### Scenario: Medusa health probe
- **WHEN** Coolify probes `http://localhost:9000/health` against the Medusa container
- **THEN** the response is 200 with `{ "status": "ok", "service": "medusa" }`

#### Scenario: Storefront health probe bypasses tenant resolution
- **WHEN** Coolify probes `http://localhost:3000/api/health` against the storefront container (Host header is the container's internal name, not a tenant hostname)
- **THEN** the proxy.ts matcher skips tenant resolution for this path and the route returns 200 with `{ "status": "ok", "service": "storefront" }`

### Requirement: Adding a new tenant subdomain is a configuration change, not a deploy
The Coolify storefront application SHALL support adding additional FQDNs (e.g. for a new tenant) without rebuilding the image — by updating the application's `fqdn` field in Coolify and triggering a "restart" rather than a "deploy".

#### Scenario: New tenant subdomain attaches in seconds
- **WHEN** the operator adds `globex2.networkbase75.site` to the storefront's `fqdn` and restarts the application
- **THEN** the new FQDN routes to the storefront container within one minute, a Let's Encrypt cert is issued on first request, and the storefront's proxy.ts resolves the new host to a tenant row that was previously inserted via the seed (or returns 404 if no row exists yet)
