# Map Provider Setup

Rastro uses `react-native-maps` for native map tiles in `Cerca` and manual pin picking. Nearby search, alert matching, and report discovery still use Rastro/PostGIS; Google Maps is only the visual map provider for native tiles and markers.

Android requires a Google Maps Platform key for native map tiles. iOS uses Apple Maps by default in the current app; configure a Google Maps iOS key only if the product intentionally enables Google Maps on iOS.

## Current App Identifiers

Keep Google Cloud restrictions aligned with `apps/expo/app.config.ts`.

| Platform | Identifier type | Current value   |
| -------- | --------------- | --------------- |
| Android  | Package name    | `bo.rastro.app` |
| iOS      | Bundle ID       | `bo.rastro.app` |

If either identifier changes, update Google Cloud key restrictions before rebuilding the dev client or release binary.

## Environment Variables

Use these exact variable names. Put real values in ignored local env files, CI secrets, or EAS environment variables only. Do not commit keys.

```env
EXPO_ANDROID_GOOGLE_MAPS_API_KEY=""
EXPO_IOS_GOOGLE_MAPS_API_KEY=""
```

| Env var                            | Required                    | Source value                                                                                                           |
| ---------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `EXPO_ANDROID_GOOGLE_MAPS_API_KEY` | Yes for Android native maps | Google Maps Platform API key restricted to Android apps and `Maps SDK for Android`.                                    |
| `EXPO_IOS_GOOGLE_MAPS_API_KEY`     | Optional                    | Google Maps Platform API key restricted to iOS apps and `Maps SDK for iOS`, only if Rastro enables Google Maps on iOS. |

Google Maps API keys are embedded in native mobile binaries. Treat them as public client keys: restrict them by application and API, monitor usage, and rotate them if exposed or misconfigured.

## Command Directory And CLI Rules

This repository is a pnpm monorepo. The Expo app lives at:

```text
/home/z/Personal/ai/rastro/apps/expo
```

Run workspace installs from the repo root:

```bash
cd /home/z/Personal/ai/rastro
pnpm install
```

Do not install the legacy Expo CLI globally with `npm install -g expo-cli`. The modern Expo CLI is included with the app's local `expo` package. Use one of these command styles instead:

From the repo root:

```bash
cd /home/z/Personal/ai/rastro
pnpm -F @acme/expo exec expo --help
pnpm -F @acme/expo exec expo run:android --help
```

Or from the Expo app directory:

```bash
cd /home/z/Personal/ai/rastro/apps/expo
pnpm exec expo --help
pnpm exec expo run:android --help
```

Do not type `expo run:android` directly unless you intentionally installed a global `expo` binary. If the terminal says `Command 'expo' not found`, that is expected for this repo. Use `pnpm exec expo run:android` from `apps/expo` or `pnpm -F @acme/expo exec expo run:android` from the repo root.

Do not run raw `npx expo run:android` from the repo root. If using `npx expo`, run it from `apps/expo`, but prefer `pnpm -F @acme/expo exec expo ...` so the workspace uses the Expo version pinned by the app.

EAS CLI is different from Expo CLI. For EAS commands such as `eas env:create`, `eas credentials`, and cloud builds, run them from `apps/expo` because `apps/expo/eas.json` is the EAS project config. Expo's docs still support installing EAS CLI globally:

```bash
npm install --global eas-cli
cd /home/z/Personal/ai/rastro/apps/expo
eas --version
```

If you do not want a global EAS install, use a one-shot command from `apps/expo`:

```bash
cd /home/z/Personal/ai/rastro/apps/expo
pnpm dlx eas-cli --version
```

## Google Cloud Setup

Use separate Google Cloud projects or at least separate keys for development, preview, and production when possible. Never reuse OAuth client IDs or OAuth client secrets as map keys.

1. Open Google Cloud Console and select or create the Rastro Maps project.
2. Confirm that billing is enabled for the project. Google Maps Platform requires a billing-enabled project for production use.
3. Go to APIs & Services > Library.
4. Enable `Maps SDK for Android`.
5. If Rastro will use Google Maps on iOS, also enable `Maps SDK for iOS`.
6. Go to APIs & Services > Credentials.
7. Select Create credentials > API key.
8. Rename the key clearly, for example `Rastro Android Maps - production`.
9. Open the key and set Application restrictions:
   - Android key: select `Android apps`.
   - iOS key: select `iOS apps`.
10. Set API restrictions:
    - Android key: restrict to `Maps SDK for Android`.
    - iOS key: restrict to `Maps SDK for iOS`.
11. Save the key and wait a few minutes for restrictions to propagate.

Do not enable or add these APIs to the mobile map key unless product code actually uses them:

- Geocoding API
- Places API
- Maps JavaScript API
- Static Maps API
- Directions API

If a future feature needs geocoding or place autocomplete, create a separate key or backend endpoint with its own restrictions rather than broadening the tile key by default.

## Android Key Restrictions

The Android key must allow every signing certificate used to install Rastro builds that need maps. Add each package/SHA-1 pair separately under the same key.

Required package name:

```text
bo.rastro.app
```

Common SHA-1 fingerprints to add:

1. Local debug/dev-client fingerprint for `expo run:android`.
2. EAS internal/preview build signing certificate fingerprint.
3. Production upload/app signing fingerprint used by Google Play, if distributing through Play.

### Local Debug SHA-1 For `expo run:android`

Local builds installed with `pnpm exec expo run:android` or `pnpm -F @acme/expo exec expo run:android` do not use EAS credentials. They use the Android debug keystore from the generated native project.

Run this from the repo root:

```bash
cd /home/z/Personal/ai/rastro
keytool -list -v \
  -keystore apps/expo/android/app/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android | grep -E 'SHA1|SHA-1'
```

If that prints no fingerprint, first confirm which keystore files exist:

```bash
cd /home/z/Personal/ai/rastro
ls -l apps/expo/android/app/debug.keystore "$HOME/.android/debug.keystore"
```

If the app-local keystore exists but the filter still hides the output, print the certificate fingerprint block without filtering:

```bash
cd /home/z/Personal/ai/rastro
keytool -list -v \
  -keystore apps/expo/android/app/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android | sed -n '/Certificate fingerprints/,+3p'
```

`$HOME/.android/debug.keystore` is common in plain Android projects, but it may not exist on this machine. For this repo, prefer `apps/expo/android/app/debug.keystore` after the native project has been generated. Do not use `android/app/debug.keystore` at the repo root for Rastro unless the Expo app was intentionally moved to the repo root.

### EAS Development, Preview, And Production SHA-1

EAS credentials are used by EAS cloud builds, not by local `expo run:android` installs. Configure the EAS signing certificate for every build profile that produces an Android binary users will install.

Run this from the Expo app directory because `apps/expo/eas.json` is the EAS project config:

```bash
cd /home/z/Personal/ai/rastro/apps/expo
eas credentials -p android
```

At `Which build profile do you want to configure?`, choose the profile that matches the binary:

- `development`: EAS development-client builds installed on devices for development.
- `preview`: internal preview builds, if this profile is used for testers.
- `production`: release builds intended for production distribution.

On the Android Credentials screen shown by EAS:

1. Select `Keystore: Manage everything needed to build your project`.
2. If no credentials exist, choose the option to generate or set up a new Android keystore. Prefer the EAS-managed/generated keystore unless you already have an existing release or upload keystore that must be preserved.
3. After the keystore exists, open the keystore details from the same `Keystore` menu and copy the `SHA-1 Certificate Fingerprint`. EAS CLI wording changes over time; look for options such as view credentials, inspect credentials, or download credentials.
4. In Google Cloud, add an Android app restriction entry with package `bo.rastro.app` and that SHA-1 fingerprint.
5. Repeat `eas credentials -p android` for `development`, `preview`, and `production` when those profiles use different signing certificates.

Do not select these EAS menu items when your goal is a Google Maps SHA-1 fingerprint:

- `Google Service Account`: used for Google Play publishing access, not Maps runtime authorization.
- `Push Notifications (Legacy)`: used for legacy FCM server credentials, not Maps.
- `credentials.json`: used to upload or download EAS credentials, not to create a Google Cloud API key restriction.

If EAS only lets you download credentials instead of showing the fingerprint, download the keystore and inspect it locally with `keytool`:

```bash
keytool -list -v \
  -keystore /path/to/downloaded-keystore.jks \
  -alias YOUR_KEY_ALIAS \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD | grep -E 'SHA1|SHA-1'
```

For Google Play App Signing, the app installed from Play is signed by the Play app signing certificate, not only the EAS upload certificate. Before final production validation, also add the Play app signing SHA-1 from Play Console > Release > Setup > App integrity > App signing key certificate.

## iOS Key Restrictions

iOS Google Maps is optional for the current app. If enabled, create a separate iOS key.

Application restriction:

```text
bo.rastro.app
```

API restriction:

```text
Maps SDK for iOS
```

Do not use the Android key for iOS. Google Cloud application restrictions are platform-specific, so one restricted key cannot serve both Android and iOS.

## Local Configuration

1. Work from the repo root:

   ```bash
   cd /home/z/Personal/ai/rastro
   ```

2. Copy the env template if needed:

   ```bash
   cp -n .env.example .env
   ```

3. Put the Android key in `.env`:

   ```env
   EXPO_ANDROID_GOOGLE_MAPS_API_KEY="YOUR_ANDROID_MAPS_KEY"
   ```

4. Add `EXPO_IOS_GOOGLE_MAPS_API_KEY` only when testing Google Maps on iOS.
5. Make sure an Android emulator is running or a physical Android device is connected:

   ```bash
   adb devices
   ```

6. Rebuild the native client after changing native map keys:

   ```bash
   pnpm exec dotenv -e .env -- pnpm -F @acme/expo exec expo prebuild --clean --platform android
   pnpm exec dotenv -e .env -- pnpm -F @acme/expo exec expo run:android --no-build-cache
   ```

   Equivalent commands from the Expo app directory, if the key is exported in
   the current shell instead of only stored in the repo root `.env`:

   ```bash
   cd /home/z/Personal/ai/rastro/apps/expo
   pnpm exec expo prebuild --clean --platform android
   pnpm exec expo run:android --no-build-cache
   ```

   `expo run:android` compiles the Android native project, installs it on the selected emulator/device, and starts Metro. It may create or update native `android/` files under `apps/expo`; review those changes before committing.

7. Start or restart Metro for the installed development client when needed:

   ```bash
   cd /home/z/Personal/ai/rastro
   pnpm exec dotenv -e .env -- pnpm -F @acme/expo exec expo start --dev-client
   ```

8. Start the API backend as described in `docs/dev/mobile-runbook.md`.

Changing the env var without rebuilding the dev client is not enough for Android because the key is written into native configuration at build time.

Verify the generated Android manifest before installing a build:

```bash
pnpm exec dotenv -e .env -- pnpm -F @acme/expo exec expo config --type introspect --json \
  | rg 'com.google.android.geo.API_KEY'
```

The command should show `com.google.android.geo.API_KEY` in Android manifest
metadata. Do not paste the key itself into logs or committed docs.

## EAS Build Configuration

If using EAS environment variables, create the values in each EAS environment used by the build profile.

```bash
cd /home/z/Personal/ai/rastro/apps/expo

pnpm eas:env:sync -- --environment preview
pnpm eas:env:sync -- --environment production
```

The sync script reads the ignored repo `.env.local` and `.env`, pushes only the
Expo mobile build allowlist, warns for missing values, and continues with the
remaining variables. Use a dry run before changing EAS:

```bash
pnpm eas:env:sync -- --environment preview --dry-run
```

Manual equivalent for Android Maps:

```bash
eas env:create \
  --name EXPO_ANDROID_GOOGLE_MAPS_API_KEY \
  --value "YOUR_ANDROID_MAPS_KEY" \
  --environment preview \
  --visibility sensitive

eas env:create \
  --name EXPO_ANDROID_GOOGLE_MAPS_API_KEY \
  --value "YOUR_ANDROID_MAPS_KEY" \
  --environment production \
  --visibility sensitive
```

Use `sensitive` or `plaintext`, not `secret`, for values that must be available while Expo evaluates app config. The key is embedded in the native app, so security depends on Google Cloud restrictions, not secrecy in the binary.

If a build profile uses EAS-managed environment variables, ensure `eas.json` maps that profile to the intended EAS environment, for example:

```json
{
  "build": {
    "preview": {
      "environment": "preview"
    },
    "production": {
      "environment": "production"
    }
  }
}
```

## Verification Checklist

Run this checklist for every environment after creating or rotating keys.

- [ ] Google Cloud project has billing enabled.
- [ ] `Maps SDK for Android` is enabled.
- [ ] Android key is restricted to Android apps.
- [ ] Android key includes package `bo.rastro.app`.
- [ ] Android key includes the SHA-1 certificate fingerprint for the installed build.
- [ ] Android key API restriction is only `Maps SDK for Android`.
- [ ] `EXPO_ANDROID_GOOGLE_MAPS_API_KEY` is present in the local or EAS build environment.
- [ ] Native Android dev client or release binary has been rebuilt after setting the key.
- [ ] `Cerca` map mode shows real map tiles, Google attribution, and report markers.
- [ ] Manual pin picking opens a real map, supports pan/zoom/tap/drag, and confirms the chosen coordinate.
- [ ] Provider-error fallback appears when the key is removed or invalid, and the list alternative remains usable.
- [ ] Runtime logs do not print the key or signed URLs.

For iOS Google Maps, additionally verify:

- [ ] `Maps SDK for iOS` is enabled.
- [ ] iOS key is restricted to iOS apps.
- [ ] iOS key includes bundle ID `bo.rastro.app`.
- [ ] iOS key API restriction is only `Maps SDK for iOS`.
- [ ] `EXPO_IOS_GOOGLE_MAPS_API_KEY` is present in the build environment.
- [ ] iOS binary has been rebuilt after setting the key.

## Troubleshooting

- Blank Android map or provider error: confirm the key is present during native build, `Maps SDK for Android` is enabled, and the installed app's package/SHA-1 pair is listed on the key.
- `Command 'expo' not found`: expected when Expo CLI is not globally installed. From `apps/expo`, run `pnpm exec expo run:android --no-build-cache`; from the repo root, run `pnpm -F @acme/expo exec expo run:android --no-build-cache`.
- Works in one build but not another: add the SHA-1 fingerprint for the certificate that signed that specific build.
- Works locally but not EAS: check that the EAS build profile is connected to the EAS environment containing `EXPO_ANDROID_GOOGLE_MAPS_API_KEY`.
- 403 or authorization failure: verify both application restriction and API restriction. Do not use a web/OAuth key.
- iOS works without Google key: expected when using Apple Maps. Only configure the iOS Google key if the app intentionally uses Google Maps on iOS.

## Sources

- Google Maps Platform getting started: https://developers.google.com/maps/get-started
- Maps SDK for Android setup: https://developers.google.com/maps/documentation/android-sdk/get-api-key
- Maps SDK for iOS setup: https://developers.google.com/maps/documentation/ios-sdk/get-api-key
- Google Maps Platform API key security guidance: https://developers.google.com/maps/api-security-best-practices
- Google Cloud API key restrictions: https://docs.cloud.google.com/docs/authentication/api-keys
- Expo EAS environment variables: https://docs.expo.dev/eas/environment-variables/
