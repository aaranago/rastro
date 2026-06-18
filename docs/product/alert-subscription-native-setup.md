# Alert Subscription Native Setup

Rastro alert subscriptions use a small Expo native boundary for:

- foreground location snapshots;
- Expo push notification permission and token registration;
- app-open and foreground refresh triggers.

The default v1 path is battery-conscious: no continuous GPS polling, no always-on socket, no background location task, and no foreground service. Location refreshes should be initiated only on app open, foreground, or a member's manual refresh. Background moving alerts require a separate explicit member setting and a separate native configuration change.

## Expo Modules

The Expo app owns the native dependencies for autolinking:

- `expo-location`
- `expo-notifications`

`apps/expo/app.config.ts` configures `expo-location` with Spanish `When In Use` location copy:

`Rastro usa tu ubicacion mientras usas la app para actualizar tu area de alertas y mostrar reportes cercanos.`

Do not enable these `expo-location` config options until the product has an explicit `alertas mientras me muevo` setting and the related permission education UI:

- `isIosBackgroundLocationEnabled`
- `isAndroidBackgroundLocationEnabled`
- `isAndroidForegroundServiceEnabled`
- background `TaskManager` location tasks

## Push Delivery Credentials

Real remote push delivery needs a development or production build. Expo Go is still useful for non-push app work, but SDK 53+ does not support push notification functionality in Expo Go.

Before validating real push delivery:

1. Replace placeholder bundle identifiers in `apps/expo/app.config.ts`:
   - `ios.bundleIdentifier`
   - `android.package`
2. Configure an EAS project ID in `extra.eas.projectId`, or pass the project ID when calling the native adapter.
3. Android: create/configure Firebase Cloud Messaging V1 credentials for the Android package and attach them to the EAS project.
4. iOS: use a paid Apple Developer account, create the bundle ID/app identifier, and configure APNs credentials through EAS.
5. Build a development client or production build with EAS and test on a push-capable device/simulator.

The client adapter only obtains the `ExpoPushToken`. The API still needs to store that token against the member's Alert Subscription and send notifications only for new nearby active Lost Pet Reports. Closed reports must not be sent.

## References

- Expo push notification setup: https://docs.expo.dev/push-notifications/push-notifications-setup/
- Expo push notification FAQ: https://docs.expo.dev/push-notifications/faq/
- Expo location config and background-location requirements: https://docs.expo.dev/versions/latest/sdk/location/
