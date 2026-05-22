## Context

The `hotbox-food-delivery` change introduced the architecture, schema, state machine, customer flow, admin operations, rider web client, and SSE live tracking. It deliberately deferred (a) live credential setup, (b) the rider native APK, (c) brand polish, and (d) docs. This change is a sequenced implementation-and-verification sprint — no new architecture, no new specs, just finishing the work already proposed.

The operator is a non-developer running a small SaaS. They have one VPS, one repo, one focus per day. Parallel work streams confuse them more than they help. The sequencing in this design exists to remove decision fatigue: every phase has a single next-action, and the next-action depends only on the previous phase being complete.

## Goals / Non-Goals

**Goals:**

- Land all remaining `hotbox-food-delivery` work in a deterministic order with single-action next-steps.
- Get to a state where the operator can demo the full three-actor loop (customer phone, admin tablet, rider phone with APK) on three real devices in under five minutes.
- Keep iteration costs low: any phase can be paused mid-stream and resumed without losing progress.
- Make the APK installable from a QR code with a public guide page.

**Non-Goals:**

- Adding any new capability, spec, or schema field.
- Multi-restaurant logic.
- iOS support.
- Push notifications (FCM/web push).
- Real Cashfree production credentials.
- Background-GPS reliability beyond foreground-service tier.
- Real-photo studio session (stock photos are acceptable for v1).

## Decisions

### D1 — Phase ordering: credentials → polish → APK → distribution → smoke test → docs

**Decision:** The six phases run in this exact order. No phase may begin before the previous phase passes its acceptance check.

**Rationale:** Credentials before polish because polish doesn't matter if the loop doesn't work. APK before distribution because distribution UI references the APK file. Smoke test on real devices before docs because the smoke test will surface things the docs need to mention. Docs last because they freeze the current state.

**Alternatives considered:**

- *Polish first to make the live demo look good before testing* — rejected. Polishing a broken loop is wasted work; you'll touch the same strings twice when bugs force changes.
- *APK before polish* — rejected. APK is high-effort; we want the live web demo looking sharp first so the operator has something to show people who arrive at https://hotbox.networkbase75.site between Phase 2 and Phase 3.

### D2 — Coolify env-var changes happen via the MCP, not the Coolify UI

**Decision:** All env-var edits in Phase 1 go through `mcp__coolify__env_vars` calls so they're audit-trailable in the task log.

**Rationale:** Matches the "Prime Directive — Claude Code Autonomy" — no manual UI clicks if a CLI/MCP path exists.

### D3 — Cashfree webhook URL registration is operator-side; we don't try to automate it

**Decision:** The Cashfree dashboard webhook registration is a one-time manual step the operator does in Phase 1. We provide the exact URL (`https://hotbox.networkbase75.site/api/cashfree/webhook`) and the exact secret to copy into their dashboard.

**Rationale:** Cashfree's dashboard doesn't expose a clean API for webhook URL registration; trying to scrape their UI would be brittle. The operator clicks through it once, takes <2 minutes.

### D4 — Polish: extract real Hotbox brand via visual inspection of the menu PDF

**Decision:** Open the Hot Box Menu.pdf in a viewer, sample the dominant red/orange and any display typography visible. Update `hotbox/web/app/globals.css`'s `@theme` block. If the brand uses a specific Google Font (e.g., Poppins, Inter Tight), wire it via `next/font` in `app/layout.tsx`.

**Rationale:** The PDF text extract didn't carry color/font info (it's a graphics-heavy PDF). A 10-minute visual inspection is more accurate than any automated palette-extraction tool, and gets us 80% of the brand fidelity for 5% of the effort.

**Alternatives considered:**

- *Hire a designer / use Figma* — rejected for v1. Demo doesn't need pixel-perfect brand fidelity; "warm fast-food restaurant" feel is enough.
- *Automated palette extraction from PDF* — rejected. Brittle; the operator can do it visually in 10 minutes.

### D5 — Menu photos: 30 curated Unsplash photos, one per category at minimum

**Decision:** Pick one good representative photo per category (Burgers, Pizza, Maggi, etc.) from Unsplash and download to `hotbox/web/public/menu/<slug>.jpg`. Update the seed JSON's `image_url` field for each item. For categories with multiple items, the items can share the category photo until a real photo session happens.

**Rationale:** A real photo session is out of scope; stock photos that match Indian fast-food are abundant on Unsplash. One photo per category is the minimum viable polish that prevents "every item looks identical" complaints.

**Alternatives considered:**

- *Photo per item (130+ photos)* — rejected. Diminishing returns.
- *AI-generated images* — rejected. Generated food images currently look uncanny and would hurt sales conversations more than help.

### D6 — Rider APK stack: Expo SDK 53+ with EAS Build (cloud)

**Decision:** Locked in `hotbox-food-delivery/design.md` D9 and D10. This change implements that decision.

### D7 — APK versioning: env var `LATEST_APK_VERSION` over a config table

**Decision:** The web app reads the current APK version from `process.env.LATEST_APK_VERSION` (already wired). Bumping requires editing the env var in Coolify and re-uploading the file. Phase 4 ships this; Phase 11 of the original spec (a self-service admin upload UI) is deferred.

**Rationale:** Demo-scale operators bump APK versions monthly at most. A manual upload + env-var bump is acceptable. The self-service UI is feature creep until there's a reason for it.

### D8 — APK distribution UX: QR code is server-rendered SVG, not a third-party JS lib

**Decision:** Use the `qrcode` npm package server-side to render the install URL as inline SVG on `/admin/rider-app`. No client-side QR libs in the bundle.

**Rationale:** Smaller bundle, faster page, deterministic rendering across devices. `qrcode` package is already in package.json from the initial scaffold.

### D9 — First-launch battery-saver guide in the rider APK uses `expo-device` for manufacturer detection

**Decision:** On first launch (or on every launch until dismissed), the rider app checks `Device.manufacturer` and shows the manufacturer-specific path to the battery whitelist. Known brands handled: Xiaomi (Settings → Apps → Battery saver → No restrictions), Oppo/Realme (Allow background activity), Vivo (High background app limit), Samsung (no action usually needed), OnePlus (no action usually needed).

**Rationale:** This is the single biggest reason foreground-service GPS apps die in the field. A tailored guide on first launch sets the rider up correctly and reduces support overhead later.

### D10 — Smoke test uses real Cashfree sandbox cards, not mocks

**Decision:** Phase 1 and Phase 5 smoke tests use Cashfree's published sandbox test cards (`4111 1111 1111 1111` etc.). We do NOT mock the webhook locally — we let Cashfree's real sandbox post to our public URL.

**Rationale:** Mocking the webhook hides the most critical class of bugs (signature verification mismatches, payload shape drift, timing). The whole point of a smoke test is to exercise the real integration.

### D11 — Demo script lives at `docs/demo-script.md`, not in OpenSpec

**Decision:** The 5-minute walk-through script for sales conversations lives in `docs/demo-script.md` (repo-root). Not in OpenSpec because OpenSpec is for change management, not operational runbooks.

### D12 — Archive both changes together at the end

**Decision:** When Phase 6 completes, run `/opsx:archive hotbox-food-delivery` then `/opsx:archive hotbox-demo-finish-line` in that order (parent before finisher) to keep history clean.

## Risks / Trade-offs

- **[Risk] Cashfree sandbox API drift.** → Their sandbox occasionally lags production by a few API-version bumps. If our `x-api-version: 2023-08-01` header gets rejected, we'll bump to the next version they support; webhook signature algorithm has been stable for years.

- **[Risk] EAS Build free-tier exhaustion.** → 30 builds/month is generous. Mitigate by batching APK changes — don't trigger a build per UI tweak; iterate via `expo start` first, then build once per stable point.

- **[Risk] Xiaomi/Oppo battery-saver still kills the rider app despite whitelist guide.** → Documented as a known limitation in `hotbox/rider-app/README.md`. Affected riders need to set "Autostart" + "No restrictions" + sometimes "Lock in recents" — the guide covers the most common combos.

- **[Risk] Real-device smoke test reveals architectural bugs (e.g., SSE doesn't reconnect on mobile network blips).** → Phase 5 is positioned BEFORE Phase 6 archive specifically to catch these. If we find a real bug, we extend Phase 5 with fixes before declaring done.

- **[Trade-off] Stock-photo menu looks slightly off vs. real food photography.** → Acceptable for v1. A real photo session is a future polish task once a real client signs.

- **[Trade-off] Manual Cashfree webhook URL registration is a click-through op rather than scripted.** → Operator one-time cost ~2 min. Saved engineering time: half a day.

- **[Trade-off] No iOS app.** → Indian SMB market is overwhelmingly Android (~96% mobile market share). iOS is a feature for richer clients later.

## Migration Plan

This change has no DB migration. It deploys via existing Coolify apps:

1. **Phase 1 deploy** — Env vars updated via MCP; existing hotbox-web auto-redeploys when env vars change (Coolify default).
2. **Phase 2 deploy** — Code changes pushed to `platform` branch; Coolify auto-rebuilds.
3. **Phase 3 — no Coolify deploy needed** — Expo project lives independently. EAS Build runs in the cloud.
4. **Phase 4 deploy** — Code changes + the APK binary committed to the repo. Coolify rebuilds.
5. **Phase 5** — No deploy. Test only.
6. **Phase 6** — Docs commits; Coolify rebuilds (docs don't affect runtime but it's cleaner to keep `platform` consistent).

**Rollback:** Each phase is git-revertable. Phase 1 env-var edits are reversible via `mcp__coolify__env_vars update` with the prior values. Phase 4 APK can be removed by deleting the file and bumping `LATEST_APK_VERSION` back; existing installs continue to work.

## Open Questions

- **Q1 — Operator's actual phone number for ADMIN_PHONE.** Set during Phase 1. Operator types it directly into Coolify or hands it to me on-chat.
- **Q2 — Cashfree sandbox app id / secret key.** Operator pastes from their Cashfree dashboard during Phase 1.
- **Q3 — MSG91 vs dev-console OTP for the smoke test.** Either works; MSG91 requires a 5-minute signup but lets non-developers test by getting a real SMS. For Phase 1, dev-console OTP is faster.
- **Q4 — Demo phone(s) for Phase 5 testing.** Operator's primary Android, plus any second device they can borrow. If they can't get a second phone, web-rider stays as the rider client during smoke test.
- **Q5 — Whether to take real Hotbox food photography for Phase 2.** Default: no (stock photos). Operator can override if they have access to real photos from the restaurant.
