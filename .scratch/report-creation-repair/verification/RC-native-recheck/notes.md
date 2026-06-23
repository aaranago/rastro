# Native media and map recheck

Date: 2026-06-22

## Diagnosis

- `Cannot find native module 'ExponentImagePicker'` was caused by a stale Android development client. The JS bundle had `expo-image-picker`, but the installed native binary did not include the native module.
- Android map fallback was caused by the Maps key not being available to the Expo app-config process used for the installed binary. The key existed in `.env`, but plain `pnpm -F @acme/expo exec expo ...` did not load it.
- Official Expo guidance matches this: native modules/config changes require a rebuilt app binary/development client, and SDK 54 `react-native-maps` writes Android Google Maps keys through native config.

## Code/config repairs

- Native report media source/edit/upload adapters now lazy-load native modules so stale clients do not redbox during route render.
- `expo-image-picker` config now sets `microphonePermission: false`; Android no longer requests `RECORD_AUDIO` for image-only report media.
- App config tests now cover Android map readiness flags and `android.config.googleMaps.apiKey`.
- Runbooks now use `pnpm exec dotenv -e .env -- ...` for Expo native rebuild/config checks when keys live in `.env`.

## Local Android verification

- `pnpm -F @acme/expo deps:check` passed.
- `pnpm -F @acme/expo typecheck`, `lint`, `test`, and `format` passed after the native repair follow-up.
- `pnpm -F @acme/api typecheck && pnpm -F @acme/api test` passed.
- `pnpm -F @acme/db typecheck && pnpm -F @acme/db test` passed.
- `pnpm exec fallow audit --base HEAD --format json --quiet 2>/dev/null || true` returned `verdict: pass`; remaining dead-code findings are inherited, not introduced by this repair.
- `pnpm exec dotenv -e .env -- sh -c 'CI=1 EXPO_NO_GIT_STATUS=1 pnpm -F @acme/expo exec expo prebuild --clean --platform android'` passed.
- `pnpm exec dotenv -e .env -- sh -c 'CI=1 EXPO_NO_GIT_STATUS=1 pnpm -F @acme/expo exec expo run:android --no-build-cache'` passed and installed `bo.rastro.app` at `2026-06-22 19:59:13`.
- Gradle autolinking listed `expo-image-picker`, `expo-image-manipulator`, and `expo-file-system`.
- `adb shell dumpsys package bo.rastro.app` shows `ImagePickerFileProvider`, `CropFileProvider`, and `FileSystemFileProvider`.
- `adb shell dumpsys package bo.rastro.app` no longer shows `RECORD_AUDIO` as a requested/granted permission.
- `EXPO_ANDROID_GOOGLE_MAPS_API_KEY=test-map-key pnpm -F @acme/expo exec expo config --type introspect --json` shows `com.google.android.geo.API_KEY` in the Android manifest and marks `RECORD_AUDIO` with `tools:node="remove"`.
- Nearby manual map UI shows an Android `Google Map` `TextureView`, not `Mapa no disponible`.
- `adb logcat` after the rebuild showed no `ExponentImagePicker`, `Cannot find native module`, Google Maps authorization failure, or fatal exception entries from the exercised paths.

## Evidence

- `nearby-after-rebuild.png`: nearby screen after rebuilt dev-client launch.
- `map-after-rebuild.png`: manual map picker after key-backed rebuild.

## Remaining manual QA

- Lost-report photo-step QA still needs a signed-in member session on the emulator. In the current run, selecting `Reportar perdida` correctly opened the auth handoff because the emulator was signed out.
- End-to-end adding a real photo still depends on signed-in backend/API QA plus the rebuilt Android client.
