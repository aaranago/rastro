# Mobile Emulator QA Runbook

Use this runbook to run Rastro on Android, capture inspectable artifacts, and let agents make UI, UX, functionality, performance, and battery improvements from evidence.

## Goals

- Make local Android setup reproducible across terminal sessions and reboots.
- Give agents a deterministic emulator loop with logs, screenshots, and pass/fail notes.
- Verify the v1 app in Spanish for Bolivia.
- Catch UI clipping, broken navigation, stale/offline behavior, permission regressions, and performance issues before release builds.

## One-Time Android Host Setup

Plain `export ANDROID_HOME=...` in one terminal is temporary. It disappears when that shell exits and will not survive a restart unless it is placed in a startup file.

Add this to the shell file you actually use, usually `~/.bashrc` for Bash or `~/.zshrc` for Zsh:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

Then reload the shell:

```bash
source ~/.bashrc
# or, for Zsh:
source ~/.zshrc
```

Verify the SDK and emulator:

```bash
printf 'ANDROID_HOME=%s\nANDROID_SDK_ROOT=%s\n' "$ANDROID_HOME" "$ANDROID_SDK_ROOT"
adb version
emulator -list-avds
emulator -accel-check
```

The known local AVD is currently:

```bash
emulator @Medium_Phone_API_36.1 -no-snapshot-load
```

If Expo reports `/home/z/Android/sdk` but the SDK lives at `/home/z/Android/Sdk`, the shell that launched Expo did not load the variables above.

Do not commit local Android SDK paths into repo config. Keep them in shell startup files or an uncommitted local `.envrc`.

## Repo Health Checks

Run these before opening the emulator when an agent is starting from an unknown state:

```bash
pnpm install
pnpm -F @acme/expo deps:check
pnpm -F @acme/expo format
pnpm -F @acme/expo lint
pnpm -F @acme/expo typecheck
pnpm -F @acme/expo test
pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true
pnpm -F @acme/expo run deps:doctor
pnpm -F @acme/expo exec expo config --type public
```

The `baseline-browser-mapping` warning is dependency freshness noise. It does not explain Android SDK or emulator startup failures.

## Mobile Dependency Policy

For Expo, React, React Native, and Expo native modules, use the latest stable versions that are compatible with the current Expo SDK line. Do not install the highest npm major directly for Expo packages, because newer SDK-line packages can compile but crash at runtime with native class mismatches.

Use Expo CLI for these dependencies:

```bash
pnpm -F @acme/expo deps:check
pnpm -F @acme/expo deps:fix
pnpm -F @acme/expo run deps:doctor
```

Prefer `expo install <package> --pnpm` over `pnpm add <package>` for Expo/RN-native packages. Keep Expo packages on `~` ranges and keep React/React DOM exact when Expo reports an expected version. If `deps:check` wants a lower version than npm `latest`, trust the Expo-compatible version unless you are intentionally doing a full Expo SDK upgrade.

In this monorepo, keep `experiments.autolinkingModuleResolution: true` in `apps/expo/app.config.ts` while on Expo SDK 54. Expo uses this to make Metro resolve the same native module copies that Android/iOS autolinking compile into the development build.

Do not enable `experiments.reactCanary` for the normal development app. It opts into a canary React renderer, which is not part of the stable Expo SDK-compatible dependency set.

## App Identity Before Device QA

`apps/expo/app.config.ts` should use real app identity before push, dev-client sharing, or store-like builds:

- `name`: `Rastro`
- `slug`: `rastro`
- `ios.bundleIdentifier`: for example `bo.rastro.app`
- `android.package`: for example `bo.rastro.app`
- `extra.eas.projectId`: the EAS project id after `eas init`

Until this is set, Android commands that need an installed package id may need the placeholder package from the current config.

## Native Map Provider Keys

`Cerca` map mode and manual pin picking use `react-native-maps`. Configure native provider keys through environment variables; do not hardcode keys in source:

```bash
export EXPO_ANDROID_GOOGLE_MAPS_API_KEY="<google-maps-android-sdk-key>"
export EXPO_IOS_GOOGLE_MAPS_API_KEY="<google-maps-ios-sdk-key>"
```

Android dev-client and store builds require `EXPO_ANDROID_GOOGLE_MAPS_API_KEY` for Google Maps tiles. iOS uses Apple Maps by default; set `EXPO_IOS_GOOGLE_MAPS_API_KEY` only when building an iOS client that opts into Google Maps provider support.

After changing native map keys, rebuild the development client or release binary:

```bash
cd /home/z/Personal/ai/rastro
pnpm -F @acme/expo exec expo prebuild --clean --platform android
pnpm -F @acme/expo exec expo run:android --no-build-cache
```

These commands are written for the repo root. If you are already inside `apps/expo`, use `pnpm exec expo ...` instead. Do not type `expo run:android` directly; `Command 'expo' not found` is expected unless you intentionally installed a global binary. Do not install the legacy `expo-cli` package globally; use the app-local Expo CLI through pnpm.

Without the required Android key, the app shows a map-provider configuration error and keeps the report list alternative available instead of rendering a fake map.

Product and Google Cloud setup details, including API enablement, key restrictions, Android SHA-1 fingerprints, and EAS environment configuration, live in `docs/product/map-provider-setup.md`.

## Report Media Storage

Photo upload sessions are owned by the backend and use S3/MinIO-compatible
private storage. Configure the bucket, endpoints, credentials, MIME limits, and
presign expiration in `.env`; see `docs/dev/report-media-storage.md` for local
MinIO, Dokploy MinIO, and AWS S3 settings.

For Android emulator upload testing, the API backend uses the internal storage
endpoint, but the presigned upload endpoint must be reachable from the emulator.
Use `10.0.2.2` for host-local MinIO, or the public Dokploy/AWS HTTPS endpoint
for device and release-like validation.

For long-running QA environments, configure the server-side
`/api/jobs/report-media-cleanup` scheduled job with `RASTRO_JOB_SECRET` so
expired pending uploads are deleted from object storage instead of accumulating.

## Auth/API Backend For Mobile QA

Rastro mobile auth uses Better Auth through the Next.js API route at `/api/auth/*`. The Expo app can launch without that backend, but email/password sign-in and account creation will fail with `Network request failed` until the backend is running and reachable from the device. In the installed Better Auth version, the public session check used by the Expo client is `/api/auth/get-session`.

Prepare local env and database once per checkout:

```bash
cp -n .env.example .env
# Edit .env if your local Postgres URL, auth secret, or port differ.
pnpm install
pnpm db:migrate
```

Use `pnpm db:push` only for intentional local schema diff experiments. With
PostgreSQL 18, the current `drizzle-kit@0.31.5` live diff can misread cataloged
NOT NULL constraints and attempt to drop constraints such as
`post_id_not_null`; PostgreSQL rejects that with `42P16` because `post.id` is
part of the primary key. The forward migrations under `packages/db/drizzle/`
are the verified clean-database path.

Start the auth/API backend in its own terminal before launching the mobile app:

```bash
pnpm -F @acme/nextjs with-env next dev --hostname 0.0.0.0 --port 3000
```

Keep `BETTER_AUTH_URL=http://localhost:3000` for local Better Auth callbacks. Use `EXPO_PUBLIC_API_BASE_URL` for the API origin that the mobile runtime can reach:

```bash
# Android emulator: 10.0.2.2 is the emulator alias for the host machine.
export EXPO_PUBLIC_API_BASE_URL="http://10.0.2.2:3000"

# Physical device: use the host's LAN IP on the same network.
export EXPO_PUBLIC_API_BASE_URL="http://<host-lan-ip>:3000"
```

Find the host LAN IP on Linux with:

```bash
hostname -I | awk '{print $1}'
```

Set `EXPO_PUBLIC_API_BASE_URL` explicitly for release-like builds, physical-device testing, and any emulator run where the fallback is ambiguous. If it is not set, `apps/expo/src/utils/base-url.ts` reads Expo's `hostUri`, removes the Metro port, and falls back to `http://<metro-host>:3000`. That fallback only works when the Next.js backend is also reachable on the same host and port. Restart Metro or the dev-client command after changing `EXPO_PUBLIC_API_BASE_URL`, because Expo reads it during app config evaluation.

Before opening the auth prompt, run the backend smoke check from the host:

```bash
MOBILE_AUTH_API_BASE_URL="http://127.0.0.1:3000" scripts/mobile-auth-backend-smoke.sh
```

For a physical-device run, also verify the LAN URL that the device will use:

```bash
MOBILE_AUTH_API_BASE_URL="http://<host-lan-ip>:3000" scripts/mobile-auth-backend-smoke.sh
```

If the backend is not running or the URL points at the wrong host, the smoke check exits non-zero and prints the unreachable `/api/auth/get-session` URL. If the route is reachable, it prints the HTTP status from the Better Auth session endpoint.

For Android emulator validation, the host smoke check should use `127.0.0.1`; the app should use `10.0.2.2`. To manually verify the emulator can reach the same session endpoint, open it in the emulator browser:

```bash
adb shell am start -a android.intent.action.VIEW -d "http://10.0.2.2:3000/api/auth/get-session"
```

The browser should show a Better Auth session response, usually `null` when no member is signed in. A browser connection error means the app will also show `Network request failed`.

Use a unique QA member for account-creation validation:

```bash
export RASTRO_QA_EMAIL="qa+mobile-$(date +%Y%m%d%H%M%S)@example.com"
export RASTRO_QA_PASSWORD="RastroQa123!"
```

In the protected `Reportar perdida` auth prompt:

- invalid sign-in with `qa.invalid@example.com` and `wrongpassword` should return a credential-specific Better Auth error, not `Network request failed`;
- creating an account with `$RASTRO_QA_EMAIL` and `$RASTRO_QA_PASSWORD` should either create a member session or return a specific backend validation error, such as duplicate email or password policy failure.

Clean up QA members created with the documented email pattern:

```bash
scripts/mobile-auth-qa-cleanup.sh
```

Deleting matching rows from `user` also removes related Better Auth `session` and `account` rows through the auth schema cascade. Do not run this cleanup for personal test accounts or provider accounts.

## EAS CLI Setup

This repo does not assume `eas` is installed globally. If `eas init` prints `Command 'eas' not found`, use the one-off CLI command instead:

```bash
cd apps/expo
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest init
```

Run EAS commands from `apps/expo`, because that is where `app.config.ts` and `eas.json` live. Running `eas init` from the repo root can initialize the wrong directory.

If you prefer a persistent global command:

```bash
pnpm add -g eas-cli
eas login
cd apps/expo
eas init
```

If `pnpm add -g` reports that the global bin directory is not configured, run:

```bash
pnpm setup
```

Then restart the terminal and try the global install again. The `pnpm dlx eas-cli@latest ...` form avoids global setup and is the recommended default for agents.

Find the active package on a device:

```bash
adb shell pm list packages | rg -i 'rastro|expo|identifier'
```

Use it as:

```bash
export APP_ID="bo.rastro.app"
```

## Running The App

Start Metro for Expo Go compatible work:

```bash
pnpm -F @acme/expo dev
```

Press `a` in the Expo terminal to open Android.

Use Expo Go only for JavaScript-only flows that rely on native APIs already bundled in Expo Go. Use a development build for this app when testing native modules, push token behavior, generated Android/iOS config, custom app identity, permissions, or anything that Expo Go cannot represent.

For native permission, push notification, or development-client testing:

```bash
pnpm -F @acme/expo android
EXPO_PUBLIC_API_BASE_URL="http://10.0.2.2:3000" pnpm -F @acme/expo exec expo start --dev-client --clear
```

After adding or updating any dependency with native code, regenerate and rebuild the native app:

```bash
pnpm -F @acme/expo exec expo prebuild --clean --platform android
pnpm -F @acme/expo exec expo run:android --no-build-cache
```

After the development build is installed, regular JS-only edits only need:

```bash
EXPO_PUBLIC_API_BASE_URL="http://10.0.2.2:3000" pnpm -F @acme/expo exec expo start --dev-client
```

## Agent QA Artifact Folder

Every emulator QA pass should create a timestamped folder:

```bash
export QA_DIR=".scratch/mobile-qa/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$QA_DIR/screenshots" "$QA_DIR/logs" "$QA_DIR/ui"
```

Capture the starting device state:

```bash
adb devices > "$QA_DIR/adb-devices.txt"
adb shell wm size > "$QA_DIR/device-size.txt"
adb shell wm density > "$QA_DIR/device-density.txt"
adb shell getprop ro.build.version.release > "$QA_DIR/android-version.txt"
pnpm -F @acme/expo exec expo config --type public > "$QA_DIR/expo-config.txt"
```

Clear noisy logs before a run:

```bash
adb logcat -c
```

Collect logs while testing:

```bash
adb logcat -v time ReactNativeJS:V Expo:V AndroidRuntime:E '*:S' > "$QA_DIR/logs/logcat.txt"
```

Stop log collection with `Ctrl-C` after the test pass.

Capture screenshots:

```bash
adb exec-out screencap -p > "$QA_DIR/screenshots/home.png"
```

Capture the accessibility tree:

```bash
adb shell uiautomator dump /sdcard/window.xml
adb pull /sdcard/window.xml "$QA_DIR/ui/window.xml"
```

Capture a short recording for jank, transitions, and scroll behavior:

```bash
adb shell screenrecord --time-limit 20 /sdcard/rastro-qa.mp4
adb pull /sdcard/rastro-qa.mp4 "$QA_DIR/rastro-qa.mp4"
```

Agents should inspect screenshots and UI dumps before changing UI. If a screenshot is blank, partially rendered, clipped, or overlapped, treat that as a failing QA signal.

## Core Functional Smoke Pass

Run this pass on a clean install or after clearing app data:

```bash
adb shell pm clear "$APP_ID"
```

Clearing app data is intentional for clean-start QA. Do not use it when validating draft persistence across app restarts.

Verify these flows:

- App opens without redbox, native crash, or endless loading.
- Bottom navigation reaches `Cerca`, `Actividad`, `Recursos`, and `Perfil`.
- All user-facing copy is Spanish and appropriate for Bolivia.
- Visitor states are usable without sign-in.
- Member-only actions show the intended sign-in or member state.
- `Cerca` shows list and map modes, radius controls, approximate locations, stale/offline messaging, and share/report actions.
- Lost report creation saves draft state, survives background/reopen, requires a photo, and clears the draft only after successful publish.
- Found report creation saves draft state, validates location/contact/photo, and preserves exact-vs-approximate public location copy.
- Sighting report creation allows optional photo but requires stronger detail/location fields.
- Adoption listing creation remains non-monetary, requires photo/contact/location, and preserves draft state.
- `Mis mascotas` creates and edits pet profiles, uses virtualized rendering, and restores in-progress profile edits.
- `Actividad` shows alert/chat/update/match states without an always-on socket.
- `Recursos` lists providers, opens provider profiles, displays verification/sponsor labels correctly, reports provider content, and marks stale cached data as `Datos guardados`.
- Permission education appears before location/photo/notification prompts.
- Offline mode shows cached or empty states without crashing.

## Offline, Background, And Permission Checks

Toggle network:

```bash
adb shell svc wifi disable
adb shell svc data disable
```

Restore network:

```bash
adb shell svc wifi enable
adb shell svc data enable
```

Background and reopen:

```bash
adb shell input keyevent KEYCODE_HOME
adb shell monkey -p "$APP_ID" 1
```

Reset permissions before testing permission education:

```bash
adb shell pm revoke "$APP_ID" android.permission.ACCESS_FINE_LOCATION || true
adb shell pm revoke "$APP_ID" android.permission.ACCESS_COARSE_LOCATION || true
```

Set an emulator location near La Paz:

```bash
adb emu geo fix -68.1193 -16.5000
```

Expected behavior:

- Foreground location is requested only from relevant surfaces such as Cerca or alerts.
- Background location is not requested in v1 unless explicit moving alerts are implemented.
- App-open and foreground refresh do not start continuous location watchers.
- Offline draft edits remain local and visible after background/reopen.
- Stale cached data is visibly marked and never looks freshly loaded.

## UI And UX Inspection Checklist

Agents should inspect screenshots at phone sizes and, when possible, a small/large emulator profile.

Check:

- No text clipping, overlap, hidden controls, or inaccessible buttons.
- Spanish labels fit their containers; long words wrap or truncate intentionally.
- Safe areas and bottom tab insets are respected.
- Forms remain usable with the keyboard open.
- Primary actions are clear and not buried below unscrollable content.
- Error, empty, offline, stale, loading, and permission states are polished.
- Lists use virtualized components for list-heavy screens.
- Images use `expo-image`, load thumbnails in list rows, and do not cause layout jumps.
- Sponsored placements are clearly labeled and never outrank recovery content.
- Color contrast and touch targets are acceptable on Android.

## Performance And Battery Pass

Use `docs/product/performance-battery-verification.md` as the product checklist.

Collect frame stats after scrolling list-heavy screens:

```bash
adb shell dumpsys gfxinfo "$APP_ID" reset
# Manually scroll Cerca, Recursos, Actividad, chat threads, and Mis mascotas.
adb shell dumpsys gfxinfo "$APP_ID" framestats > "$QA_DIR/logs/gfxinfo-framestats.txt"
```

Collect memory:

```bash
adb shell dumpsys meminfo "$APP_ID" > "$QA_DIR/logs/meminfo.txt"
```

Look for battery-heavy behavior:

```bash
adb shell dumpsys location > "$QA_DIR/logs/location.txt"
adb shell dumpsys alarm > "$QA_DIR/logs/alarms.txt"
adb shell dumpsys jobscheduler > "$QA_DIR/logs/jobscheduler.txt"
```

Expected behavior:

- No continuous GPS polling in default v1 flows.
- No foreground service for location by default.
- No background location task by default.
- No always-on socket in default chat/activity/alert surfaces.
- Image processing is represented by normalized/compressed assets before upload boundaries.
- Large lists scroll without obvious dropped frames or blank rows.

## Agent Improvement Loop

Agents should follow this loop for every issue found in emulator QA:

1. Reproduce the issue and save the exact artifact path in `.scratch/mobile-qa/...`.
2. State the failing behavior in one sentence.
3. Prefer adding or updating a deterministic test before changing code.
4. Make the smallest code change that fixes the reproduced issue.
5. Re-run the relevant unit tests and the original emulator check.
6. Re-run `pnpm -F @acme/expo lint`, `typecheck`, and `test` before committing.
7. Run Fallow before committing non-trivial TypeScript changes:

```bash
pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true
```

Do not make broad visual rewrites from a single screenshot. Create a narrow failing checklist item, fix it, and capture the corrected screenshot.

## Troubleshooting

Android SDK path not found:

- Confirm the Expo terminal sees `ANDROID_HOME`.
- Confirm the path case is `Sdk`, not `sdk`, on this machine.
- Reload shell config or launch the editor/agent from a shell that has the variables.

Emulator quits during launch:

```bash
emulator @Medium_Phone_API_36.1 -no-snapshot-load -gpu swiftshader_indirect
```

If it still quits, wipe data or recreate the AVD in Android Studio Device Manager.

Metro or native build is stale:

```bash
pnpm -F @acme/expo exec expo start --clear
```

Do not run `pnpm -F @acme/expo clean` automatically. That script deletes generated caches, native folders, and `node_modules`; ask for explicit approval before using it.

ADB cannot see the emulator:

```bash
adb kill-server
adb start-server
adb devices
```

Dev client cannot connect to Metro:

- Use the same Wi-Fi/network namespace when testing a physical device.
- For emulator, prefer the local development URL shown by Expo.
- Restart Metro with `--clear` if the dev client opens an old bundle.

Push notifications cannot be fully validated in Expo Go. Use an EAS development or production build with real package identifiers, EAS project id, and Android/iOS push credentials.
