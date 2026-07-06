import { describe, expect, it } from "vitest";

import type { AppStateDescriptor } from "./app-state-types";
import {
  createOfflineStateDescriptor,
  createPermissionDeniedDescriptor,
  createPermissionEducationDescriptor,
  createRetryStateDescriptor,
} from "./app-state-model";

describe("app state descriptors", () => {
  it("explains location permission context before requesting the system prompt", () => {
    const descriptor = createPermissionEducationDescriptor({
      preset: "nearby-location",
    });

    assertAppStateKind(descriptor, "permission-education");
    expect(descriptor.permission).toBe("location");
    expect(descriptor.context).toBe("nearby");
    expect(descriptor.title).toBe("Usa tu ubicación en Cerca");
    expect(descriptor.body).toContain("reportes cercanos");
    expect(descriptor.body).not.toMatch(/carousel|bienvenida/i);
    expect(descriptor.actions.map((action) => action.id)).toEqual([
      "request-permission",
      "manual-search",
    ]);
  });

  it("keeps denied location usable through manual search and settings actions", () => {
    const descriptor = createPermissionDeniedDescriptor({
      permission: "location",
    });

    assertAppStateKind(descriptor, "permission-denied");
    expect(descriptor.hasManualAlternative).toBe(true);
    expect(descriptor.actions.map((action) => action.id)).toEqual([
      "manual-search",
      "open-settings",
    ]);
    expect(descriptor.body).toContain("Bolivia");
  });

  it("distinguishes stale cached offline content from a fresh offline retry", () => {
    const stale = createOfflineStateDescriptor({
      isStale: true,
      contentLabel: "resultados guardados",
      lastUpdatedLabel: "Actualizado ayer",
    });
    const fresh = createOfflineStateDescriptor({
      isStale: false,
      contentLabel: "borrador guardado",
    });

    assertAppStateKind(stale, "offline");
    assertAppStateKind(fresh, "offline");
    expect(stale.statusLabel).toBe("Datos guardados");
    expect(stale.body).toContain("desactualizado");
    expect(stale.lastUpdatedLabel).toBe("Actualizado ayer");
    expect(fresh.statusLabel).toBe("Sin conexión");
    expect(fresh.body).not.toContain("desactualizado");
  });

  it("models retry queues through a stable retry action id", () => {
    const descriptor = createRetryStateDescriptor({
      retryTargetLabel: "el reporte de Bruno",
      queuedActionCount: 2,
    });

    assertAppStateKind(descriptor, "retry");
    expect(descriptor.title).toBe("Listo para reintentar");
    expect(descriptor.body).toContain("2 acciones pendientes");
    expect(descriptor.retryTargetLabel).toBe("el reporte de Bruno");
    expect(descriptor.actions[0]?.id).toBe("retry");
  });
});

function assertAppStateKind<K extends AppStateDescriptor["kind"]>(
  descriptor: AppStateDescriptor,
  kind: K,
): asserts descriptor is Extract<AppStateDescriptor, { kind: K }> {
  expect(descriptor.kind).toBe(kind);
}
