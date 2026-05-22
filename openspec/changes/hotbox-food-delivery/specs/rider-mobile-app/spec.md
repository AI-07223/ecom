## ADDED Requirements

### Requirement: Expo project at `hotbox/rider-app/`

The system SHALL include an Expo SDK 53+ project at `hotbox/rider-app/`, with its own `package.json`, `app.json`/`app.config.ts`, and TypeScript config. The project SHALL be configured to produce a signed Android APK via EAS Build (`eas.json` with `preview` and `production` profiles).

#### Scenario: Local dev build
- **WHEN** a developer runs `npx expo start` in `hotbox/rider-app/`
- **THEN** the Expo dev server starts on the default port
- **AND** a developer can scan the QR with Expo Go to test the UI (without background-location permissions — that's APK-only)

#### Scenario: Cloud APK build
- **WHEN** a developer runs `eas build --platform android --profile preview --non-interactive`
- **THEN** EAS Build returns a downloadable APK URL within ~10 minutes
- **AND** the build includes the `expo-location` background mode and the rider app's signing config

### Requirement: Rider OTP login

The rider app SHALL authenticate via the same phone-OTP flow as the web. The app SHALL store the resulting session token in `expo-secure-store` and attach it as a bearer header on every request to `hotbox.networkbase75.site`.

#### Scenario: First launch
- **WHEN** the rider opens the app for the first time
- **THEN** the welcome screen prompts for their phone number
- **AND** entering it triggers an OTP send via the same backend endpoint as the web
- **AND** correct OTP entry stores the session and routes to the home screen

#### Scenario: Session restore on app re-open
- **WHEN** the rider re-opens the app after closing it
- **THEN** if a valid session is in secure storage, the app skips login
- **AND** lands on the home screen directly

### Requirement: Assigned-order screen

The rider's home screen SHALL show their current assigned order (if any) with restaurant pickup address, customer delivery address, items list, and one prominent action button reflecting the next-allowed state transition. If there is no active order, the screen SHALL show "Waiting for assignment" with a refresh-on-pull gesture.

#### Scenario: Order is in ASSIGNED state
- **GIVEN** the rider has been assigned order 1042
- **WHEN** the rider opens the app
- **THEN** the screen shows restaurant address + customer address + items
- **AND** a single big "I've picked up the order" button

#### Scenario: Tapping picked up
- **WHEN** the rider taps "I've picked up the order"
- **THEN** the order transitions to `PICKED_UP`
- **AND** the foreground location service starts (see next requirement)
- **AND** the button changes to "I've delivered the order"

#### Scenario: Tapping delivered
- **WHEN** the rider taps "I've delivered the order"
- **THEN** the order transitions to `DELIVERED`
- **AND** the foreground location service stops
- **AND** the rider's `current_order_id` becomes `NULL`
- **AND** the screen returns to "Waiting for assignment"

### Requirement: Foreground location service (Tier 2 reliability)

The system SHALL implement a foreground location service using `expo-task-manager` + `expo-location` background-mode that persists a status-bar notification "Hotbox Rider — tracking active" while a delivery is in progress. The service SHALL post a ping to `POST /api/rider/ping` every 5 seconds while running. The service SHALL run only between `PICKED_UP` (start) and `DELIVERED` (stop) transitions.

#### Scenario: Service starts on pickup
- **WHEN** the rider taps "I've picked up the order"
- **THEN** within 3 seconds Android shows the persistent notification
- **AND** a ping is sent within 10 seconds of pickup

#### Scenario: Service survives screen lock
- **GIVEN** the foreground service is running
- **WHEN** the rider locks their phone (screen off)
- **THEN** pings continue to fire every 5 seconds
- **AND** the persistent notification remains visible (when screen is unlocked)

#### Scenario: Service stops on delivery
- **WHEN** the rider taps "I've delivered the order"
- **THEN** the service stops cleanly
- **AND** the persistent notification is dismissed
- **AND** no further pings are sent until the next pickup

#### Scenario: User dismisses the notification
- **WHEN** the rider dismisses the persistent notification via Android's UI
- **THEN** the foreground service stops (per Android's spec — service cannot survive notification dismissal)
- **AND** on next app foreground, the app detects no active service for an in-progress delivery and offers to "Resume tracking"

### Requirement: Battery-saver guidance on first install

The system SHALL show a one-screen "First-time setup" flow inside the rider app on first launch that:
- Explains the persistent notification is required
- Detects the phone manufacturer (via `expo-device`) and shows the relevant whitelist instructions for known-aggressive brands (Xiaomi, Oppo, Vivo, Realme)
- Provides a "Skip — I'll do this later" button (we don't gate setup on this)

#### Scenario: First launch on a Xiaomi device
- **WHEN** the rider opens the app for the first time on a Xiaomi/MIUI device
- **THEN** the setup screen shows the specific path: "Settings → Apps → Hotbox Rider → Battery saver → No restrictions"
- **AND** also "Settings → Apps → Hotbox Rider → Autostart → On"

### Requirement: Admin APK distribution page

The web app SHALL expose `/admin/rider-app` to admins, showing the current APK's version, build date, and three actions:
- "Download APK" — links to `/downloads/rider-v<version>.apk` served by Next.js from `public/downloads/`
- "Copy install link" — copies the install-guide URL to the clipboard
- "Send via WhatsApp" — opens `https://wa.me/?text=<url-encoded-install-link>` in a new tab

The page SHALL also render a QR code (server-side generated SVG, no third-party JS) encoding the install-guide URL so a rider can scan it from across the room.

#### Scenario: Admin copies the install link
- **WHEN** admin taps "Copy install link"
- **THEN** the system clipboard contains `https://hotbox.networkbase75.site/r/install`

#### Scenario: Admin scans QR with their own phone
- **WHEN** admin renders `/admin/rider-app`
- **THEN** the QR code is visible as a black-on-white SVG
- **AND** decoding the QR yields the install-guide URL

### Requirement: Public install guide page

The web app SHALL expose a public `/r/install` page (no auth required) that the rider visits via the share link or QR scan. The page SHALL include:
- A prominent "Download Hotbox Rider APK" button linking to the latest APK
- An illustrated 3-step guide: (1) Download, (2) Allow installs from unknown sources, (3) Install
- Per-manufacturer battery-saver tips (collapsible accordion for Xiaomi, Oppo, Vivo, Realme, Samsung, OnePlus)

#### Scenario: Rider visits install link on phone browser
- **WHEN** the rider opens `https://hotbox.networkbase75.site/r/install`
- **THEN** the page renders mobile-first
- **AND** the download button is the first thing in the viewport

### Requirement: APK versioning and update check

The system SHALL serve a `GET /api/rider/latest-version` endpoint returning `{ version: "0.1.0", apk_url: "/downloads/rider-v0.1.0.apk", changelog?: string }`. The rider app SHALL call this endpoint on app start; if its bundled version is older, a non-blocking banner appears with a "Get latest version" link.

#### Scenario: Rider's APK is current
- **GIVEN** rider has v0.1.0 installed and `/api/rider/latest-version` returns `0.1.0`
- **WHEN** the app starts
- **THEN** no update banner is shown

#### Scenario: Rider's APK is outdated
- **GIVEN** rider has v0.1.0 installed and `/api/rider/latest-version` returns `0.2.0`
- **WHEN** the app starts
- **THEN** a yellow banner at the top of the home screen reads "Update available: v0.2.0 — tap to download"
- **AND** tapping the banner opens the system browser to the APK URL

### Requirement: APK storage and replacement workflow

The system SHALL host APK files at `hotbox/web/public/downloads/rider-v<semver>.apk`. New APK versions SHALL be uploaded via a manual admin flow (Phase 1: copy file into the build, redeploy; Phase 2: an `/admin/rider-app/upload` form — Phase 2 is deferred but the storage path is locked).

#### Scenario: Replacing the APK
- **WHEN** a new APK is uploaded to `hotbox/web/public/downloads/rider-v0.2.0.apk`
- **AND** the `/api/rider/latest-version` response is bumped (via env var or DB row — choose at apply-time)
- **THEN** the install-guide page and admin distribution page reflect the new version
