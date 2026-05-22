# Hotbox Rider (Android APK)

Expo SDK 53 app that delivery riders install on their Android phones. Same OTP-login flow as the web; foreground location service that keeps tracking running with the screen off.

## What it does

```
   1. Rider opens the app
   2. Signs in with phone + OTP (same /api/otp/* endpoints as the web)
   3. Polls /api/rider/current-order to see their assigned delivery
   4. Three big action buttons matching the order state:
        ASSIGNED          → "I've picked up the order"     → PICKED_UP
        PICKED_UP         → "Heading out — start tracking"  → OUT_FOR_DELIVERY
        OUT_FOR_DELIVERY  → "I've delivered the order"      → DELIVERED
   5. When OUT_FOR_DELIVERY, posts /api/rider/ping every 5 sec
        with a persistent Android notification keeping the
        foreground service alive
```

## Local development

```bash
cd hotbox/rider-app
npm install
npx expo start  # scan with Expo Go on Android
```

In Expo Go, the foreground service won't work (that's APK-only) but the UI flows work.

## Building the APK

You need an Expo account (free): <https://expo.dev/signup>.

First-time setup:

```bash
npm install -g eas-cli  # or use npx
npx eas login
npx eas init   # creates the EAS project, writes the projectId into app.json
```

Build:

```bash
npm run build:apk  # ≈ 8-12 min on EAS cloud (free tier: 30 builds/mo)
```

The EAS dashboard shows the build progress and gives you a download URL when done. Or use:

```bash
npm run build:apk-local  # requires Android SDK + JDK installed locally
```

After the APK lands, copy it to the web app:

```bash
cp ~/Downloads/hotbox-rider-*.apk \
   ../web/public/downloads/rider-v0.1.0.apk
```

Then bump `LATEST_APK_VERSION` in the Coolify env vars and restart `hotbox-web`.

## Project layout

```
   hotbox/rider-app/
   ├── app/
   │   ├── _layout.tsx       expo-router root, imports lib/location-task to register it
   │   ├── index.tsx         home — current order + action button + update banner
   │   ├── login.tsx         phone + OTP screens
   │   └── setup.tsx         first-launch battery-saver tips per manufacturer
   ├── lib/
   │   ├── config.ts         BASE_URL + ping interval + task name
   │   ├── api.ts            fetch wrapper with Bearer auth + typed API helpers
   │   └── location-task.ts  expo-task-manager registration + startTracking/stopTracking
   ├── assets/               icon.png, splash.png, adaptive-icon.png  ← REPLACE with real brand assets
   ├── app.json              Expo config + Android permissions
   ├── eas.json              EAS Build profiles (preview = APK, production = AAB)
   └── package.json
```

## Known sharp edges

- **Asset files are placeholders.** The app loads `assets/icon.png`, `assets/splash.png`, `assets/adaptive-icon.png` — drop in real brand-colored PNGs before the first real EAS build. Generic Expo icons will appear otherwise.
- **Battery savers.** Xiaomi/Oppo/Vivo/Realme can kill the foreground service. The `/setup` screen detects the manufacturer and shows the right whitelist steps. First-time riders MUST follow it or tracking dies.
- **Background-only permission gracefully degrades.** If the rider denies `ACCESS_BACKGROUND_LOCATION`, the foreground service still works while the app is foregrounded plus screen-locked (via the persistent notification). This is Tier 2 reliability — the v1 target.
- **Push notifications are not wired.** Rider has to open the app to see "you've been assigned." Acceptable for the v1 demo. FCM is a v2 ad-on.
- **iOS is not supported.** Indian SMB rider market is ≈ 96% Android.

## Bumping the version

1. Increment `version` in `app.json` and `package.json`.
2. Run `npm run build:apk`.
3. Download → copy to `hotbox/web/public/downloads/rider-v<new>.apk`.
4. Update `LATEST_APK_VERSION` in Coolify env vars.
5. Existing installed APKs will see a yellow "Update available" banner on next app launch.

## See also

- The web-side endpoints the APK calls:
  `/api/otp/{send,verify}`, `/api/rider/current-order`,
  `/api/rider/order/<id>/{picked-up,out-for-delivery,delivered}`,
  `/api/rider/ping`, `/api/rider/latest-version`.
- The web admin: `/admin/rider-app` for QR-code distribution and version display.
- The public install guide: `/r/install` with per-manufacturer battery tips.
