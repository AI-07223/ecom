## ADDED Requirements

### Requirement: Rider GPS ping ingest endpoint

The system SHALL expose a `POST /api/rider/ping` endpoint accepting `{ lat: number, lng: number, accuracy_m?: number, ts: ISO-8601 string }` from an authenticated rider. The endpoint SHALL upsert the latest ping into a `rider_pings_latest` row keyed by `rider_id`, append the same data to a `rider_pings` log table (for trail rendering), update `riders.last_ping_at`, and emit a `pg_notify` on a channel named `order_track_<orderId>` when the rider has a `current_order_id`.

#### Scenario: Rider sends a ping while on a delivery
- **GIVEN** the rider has `current_order_id = 1042`
- **WHEN** the rider client POSTs `{ lat: 12.97, lng: 77.59, ts: "2026-05-22T16:00:00Z" }`
- **THEN** `rider_pings_latest` is updated for that rider
- **AND** `rider_pings` gets a new row
- **AND** `pg_notify('order_track_1042', '{"lat":12.97,"lng":77.59,...}')` fires

#### Scenario: Rider sends a ping with no active order
- **GIVEN** the rider has `current_order_id = NULL`
- **WHEN** the rider client POSTs a ping
- **THEN** the upsert succeeds (we still know where the rider is)
- **AND** no `pg_notify` is fired (nothing to subscribe to)

#### Scenario: Unauthenticated ping rejected
- **WHEN** a request without a valid rider session POSTs to `/api/rider/ping`
- **THEN** the system returns HTTP 401

#### Scenario: Throttling
- **WHEN** the same rider POSTs more than 1 ping per second
- **THEN** the extra requests are accepted but only the latest is broadcast (debounced) — the `rider_pings_latest` row is overwritten; the `rider_pings` log is kept lossy by design

### Requirement: SSE stream per order

The system SHALL expose `GET /api/track/[orderId]/stream` returning a `text/event-stream` response. The stream SHALL emit:
- An initial event with the order's current state and the rider's latest ping (if any)
- Subsequent events on every state transition (mirrored from `order_events`)
- Subsequent events on every rider ping while the order is in `OUT_FOR_DELIVERY` or `PICKED_UP`

#### Scenario: Customer opens the track page mid-delivery
- **GIVEN** order 1042 is in state `OUT_FOR_DELIVERY` and the rider has been pinging
- **WHEN** the customer's browser opens `/api/track/1042/stream`
- **THEN** the first SSE event contains `{ state: "OUT_FOR_DELIVERY", lat, lng, ts }` from the most recent ping
- **AND** subsequent rider pings arrive as SSE events within 2 seconds of being POSTed

#### Scenario: Stream survives reconnect
- **WHEN** the SSE connection drops (e.g., mobile network blip)
- **THEN** the browser's `EventSource` reconnects automatically
- **AND** the first event on the new connection is a "current state" snapshot (the same shape as the initial event)

#### Scenario: Stream closes on DELIVERED
- **WHEN** the order transitions to `DELIVERED`
- **THEN** the system pushes one final SSE event with `{ state: "DELIVERED", delivered_at }`
- **AND** closes the stream gracefully

### Requirement: Customer live tracking page

The customer's `/track/[orderId]` route SHALL render two stacked panels: a vertical timeline of `order_events` rows and (when the order's current state is `OUT_FOR_DELIVERY` or `PICKED_UP`) a map showing the rider's latest position. The page SHALL connect to the SSE stream and update both panels live.

#### Scenario: Pre-pickup view
- **GIVEN** order 1042 is in state `PREPARING`
- **WHEN** the customer opens the track page
- **THEN** the timeline shows `Placed → Accepted → Preparing` with timestamps
- **AND** no map is rendered
- **AND** a "We'll show the map once the rider is on the way" hint is visible

#### Scenario: Out-for-delivery view
- **WHEN** the order transitions to `OUT_FOR_DELIVERY`
- **THEN** the map panel appears below the timeline
- **AND** the rider's dot is drawn at the latest known lat/lng
- **AND** the customer's delivery-address marker is drawn at the address lat/lng
- **AND** as new pings arrive, the rider's dot animates to the new position

#### Scenario: ETA is rough and honest
- **GIVEN** rider has a recent ping and customer's address has lat/lng
- **WHEN** the page renders the map
- **THEN** a simple "Arriving in ~N min" estimate is shown, computed from straight-line distance at an assumed average speed (configurable, default 20 km/h)
- **AND** a "Approximate ETA" disclaimer is visible (no routing engine in v1)

### Requirement: Auto-flip rider to available after DELIVERED

The system SHALL set the rider's `current_order_id = NULL` in the SAME database transaction as the order's `DELIVERED` transition. The admin's "Assign rider" dropdown SHALL reflect the rider as available on its next render.

#### Scenario: Rider taps "Delivered" via APK
- **WHEN** the rider's `POST /api/rider/order/1042/deliver` succeeds
- **THEN** the order is in state `DELIVERED`
- **AND** the rider row's `current_order_id` is `NULL`
- **AND** the rider's web/APK view shows "No active delivery — waiting for next assignment"

### Requirement: Rider trail retention

The system SHALL retain `rider_pings` rows for at most 7 days. A daily prune job (cron or pg-extension `pg_cron` — choice deferred) SHALL `DELETE FROM rider_pings WHERE ts < NOW() - INTERVAL '7 days'`. `rider_pings_latest` is unbounded (one row per rider).

#### Scenario: Old pings pruned
- **WHEN** the prune job runs and `rider_pings` contains rows older than 7 days
- **THEN** those rows are deleted
- **AND** the rest of the table is untouched
