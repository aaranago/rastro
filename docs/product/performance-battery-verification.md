# Performance And Battery Verification

Use this checklist for the issue 24 iOS and Android pass before release candidates.

## Manual Checklist

- Virtualized lists: verify list-heavy surfaces use `LegendList`, `FlatList`, or another virtualized list instead of rendering mapped rows inside `ScrollView`. Current list-heavy surfaces include Cerca results, Recursos results, Actividad, chat threads, and Mis Mascotas.
- Images: verify uploaded pet/report/listing photos are compressed before storage, EXIF metadata is stripped from user-facing records, and list thumbnails load through optimized `expo-image` assets sized for the rendered slot.
- Sockets: verify chat, alerts, and activity do not open always-on sockets in the default v1 experience. Polling or refresh should be tied to screen focus, app foregrounding, or member action.
- Foreground location: verify alert area updates happen only when the app opens, returns to foreground, or the member taps the manual refresh action.
- Background location: verify iOS and Android background location prompts, foreground services, and background `TaskManager` location tasks remain disabled unless the member explicitly enables `Alertas mientras me muevo` and the product has the related permission education UI.
- Platform settings: on iOS and Android builds, inspect native permission copy and generated manifests/plists to confirm only foreground location is configured for the default alert flow.

## Regression Notes

- `apps/expo/src/features/alert-subscriptions/alert-subscription-native-adapter.test.ts` verifies app-open and foreground refresh triggers do not start a location watcher, do not request background location, and do not sample location until a foreground snapshot is requested.
- `apps/expo/src/features/alert-subscriptions/alert-subscriptions.test.ts` verifies the alert location update policy allows only app-open, foreground, and manual-refresh reasons, with no continuous polling, no location watcher, and no always-on socket.
- `docs/product/alert-subscription-native-setup.md` records the native setup constraint: background location config is deferred until explicit moving alerts and permission education exist.
