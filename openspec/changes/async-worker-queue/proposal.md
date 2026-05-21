## Why

A user clicking "Place Order" should not wait while the confirmation email sends, the inventory hook fires, the search index updates, and the analytics event posts. Doing all that synchronously during the request makes checkout slow and fragile — one slow downstream service stalls the whole page. This change moves those side effects into a BullMQ worker process backed by the existing Redis, gives them retries with backoff, and adds an admin view to inspect queue health.

## What Changes

- Add `apps/worker/` — a long-running Node process (not a request handler) that subscribes to BullMQ queues and processes jobs. Runs as its own Coolify service depending on `redis`.
- Define initial queues: `email-send` (with Resend retry policy), `search-index` (push product changes to Meili), `webhook-out` (Cashfree webhook acks that need to wait), `analytics-event` (placeholder for later).
- Replace the synchronous Resend call in the `per-tenant-transactional-emails` change with a queue.add. The order placement returns immediately; the email lands seconds later or retries up to 5x with exponential backoff before going to a dead-letter queue.
- Replace the synchronous Meili index push (from `server-side-search-meili`) with a queue.add for the same reason.
- Add a tiny admin view inside the agency Medusa admin (NOT the per-tenant client-admin) at `/admin/queues` showing each queue's depth, recent failures, and a "retry" button for dead-letter entries.
- Add structured logging of job lifecycle (`enqueue`, `start`, `complete`, `fail`, `retry`) tied to a `job_id` so a trace from request → enqueue → worker is reconstructible.

## Capabilities

### New Capabilities
- `async-jobs`: A BullMQ-backed worker process with named queues, retries, exponential backoff, and a dead-letter queue.
- `queue-observability`: An agency-scoped view of every queue's depth, throughput, and failures with one-click retry.

### Modified Capabilities
- `transactional-email-templates`: Order-confirmation emails are sent via the queue, not synchronously.
- `product-index-sync`: Meili indexing happens via the queue, not the Medusa subscriber's synchronous path.

## Impact

- **Code**: New `apps/worker/` workspace (Node + BullMQ + same `@platform/tenancy` and emailer modules), refactored synchronous send sites to use queue.add, new agency-admin queues view.
- **Dependencies**: `bullmq`, `ioredis`. Redis is already in the stack.
- **Infra**: New Coolify service for the worker. Same Redis as the existing platform (Bull keyspace-prefixed `bull:*`).
- **Risk**: Lost jobs on worker crash. Mitigated by BullMQ's at-least-once delivery semantics + dead-letter queue + the queues admin view making stalls visible to the operator.
