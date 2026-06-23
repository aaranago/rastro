import type { ReportMapProviderState } from "./report-map";

export function getNativeMapProviderState(): ReportMapProviderState {
  // Android Google Maps readiness is a native-build concern. The JS manifest can
  // be served by Metro without the same env that produced the installed binary,
  // so it must not hard-block rendering here.
  return { kind: "ready" };
}
