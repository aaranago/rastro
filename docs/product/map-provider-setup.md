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

Local debug SHA-1:

```bash
keytool -list -v \
  -keystore "$HOME/.android/debug.keystore" \
  -alias androiddebugkey \
  -storepass android \
  -keypass android | rg 'SHA1'
```

EAS/production SHA-1:

```bash
eas credentials -p android
```

Record the SHA-1 fingerprint for the certificate that signs the build users will install. For Google Play App Signing, the runtime app is signed by the app signing certificate, not only the upload certificate, so verify the Play Console certificate fingerprints before final production validation.

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

1. Copy the env template if needed:

   ```bash
   cp -n .env.example .env
   ```

2. Put the Android key in `.env`:

   ```env
   EXPO_ANDROID_GOOGLE_MAPS_API_KEY="YOUR_ANDROID_MAPS_KEY"
   ```

3. Add `EXPO_IOS_GOOGLE_MAPS_API_KEY` only when testing Google Maps on iOS.
4. Rebuild the native client after changing native map keys:

   ```bash
   pnpm -F @acme/expo exec expo prebuild --clean --platform android
   pnpm -F @acme/expo exec expo run:android --no-build-cache
   ```

5. Start the API backend and Expo app as described in `docs/dev/mobile-runbook.md`.

Changing the env var without rebuilding the dev client is not enough for Android because the key is written into native configuration at build time.

## EAS Build Configuration

If using EAS environment variables, create the values in each EAS environment used by the build profile.

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
