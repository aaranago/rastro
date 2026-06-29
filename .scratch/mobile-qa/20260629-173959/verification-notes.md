# Recursos Android runtime verification - `ed513dc`

Date: 2026-06-29 17:39-17:43 America/La_Paz.

Commit under test: `ed513dc2032b1a41c0d444e2e9ad832e69f56468` (`Fix resources nearby dev API base URL`).

Result: pass for the stale/offline ngrok `resources.nearby` JSON parse regression.

## Runtime stack

- Started from repo root with `script -q -f .scratch/mobile-qa/20260629-173959/root-dev-tty.log -c 'env TURBO_UI=true pnpm dev'`.
- Dev stack reached Expo Metro on `http://localhost:8081` and Next.js on `http://localhost:3000`.
- Host Next.js root smoke returned `HTTP/1.1 200 OK`.
- Android emulator: `emulator-5554`, `Medium Phone API 36.1`, Android 16.
- Installed package: `bo.rastro.app`.

## Raw HTTP smoke

Command:

```bash
curl -sS -D .scratch/mobile-qa/20260629-173959/resources-nearby-smoke-headers.txt \
  -o .scratch/mobile-qa/20260629-173959/resources-nearby-smoke-body.json \
  --max-time 20 \
  "http://localhost:3000/api/trpc/resources.nearby?input=..."
```

Result:

- `HTTP/1.1 200 OK`
- `content-type: application/json`
- Response body parsed with `JSON.parse`.
- Response contained backend resource provider data.

## Android Recursos runtime proof

Steps:

1. Cleared logcat with `adb -s emulator-5554 logcat -c`.
2. Launched `bo.rastro.app` through `mcp__mobile_mcp.mobile_launch_app` using `es-BO`.
3. Navigated from `Actividad` to `Recursos`.
4. Saved screenshot and UI hierarchy after the Recursos query completed.
5. Dumped logcat after Recursos loaded.

Evidence:

- Screenshot: `android-recursos.png`
- UI hierarchy: `android-recursos-uiautomator.xml`
- Logcat: `logcat-after-recursos.txt`
- Negative scan: `negative-parse-scan.txt`

Observed UI:

- Recursos loaded the backend-backed directory.
- Visible provider: `Veterinaria QA Recursos Actualizada`.
- No visible `JSON Parse error: Unexpected character: T`.

Observed logcat:

- `resources.nearby` request was issued from Android with `http://10.0.2.2:3000/api/trpc/resources.nearby?...`.
- `resources.nearby` response returned `status: 200`, `ok: true`, and `content-type: application/json`.
- Negative scan found no `JSON Parse error`, `Unexpected character: T`, `TRPCClientError`, `ERR_NGROK`, `The endpoint`, `ngrok`, or `text/plain` match.

## Residual risk

Logcat includes an unrelated `ExpoImage/Glide` error:

```text
Expected URL scheme 'http' or 'https' but was 'sf'
```

This did not block the Recursos directory or the `resources.nearby` request, and it is not the stale-ngrok/tRPC JSON parse failure under verification.
