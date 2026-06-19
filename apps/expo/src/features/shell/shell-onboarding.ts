import type { ShellCopy } from "../../i18n";
import type { AsyncKeyValueStorage } from "../resilience/storage";

export type ShellFirstRunTourCompletionReason = "complete" | "skip";

export interface ShellFirstRunTourStore {
  hasCompleted: () => Promise<boolean>;
  markCompleted: (input: {
    reason: ShellFirstRunTourCompletionReason;
  }) => Promise<void>;
}

export interface ShellFirstRunTourModel {
  completeLabel: string;
  nextLabel: string;
  shouldShow: boolean;
  skipLabel: string;
  stepLabel: (currentStep: number, totalSteps: number) => string;
  steps: ShellFirstRunTourStep[];
}

export interface ShellFirstRunTourStep {
  body: string;
  iconFallback: string;
  iconName: string;
  title: string;
}

const firstRunTourStorageKey = "rastro:shell:first-run-tour:v1";

const firstRunTourCopy = {
  completeLabel: "Empezar",
  nextLabel: "Siguiente",
  skipLabel: "Omitir",
  stepLabel: (currentStep: number, totalSteps: number) =>
    `Paso ${currentStep} de ${totalSteps}`,
  steps: [
    {
      title: "Encuentra reportes cerca",
      body: "Explora mascotas perdidas, encontradas y avistamientos por zona en Bolivia. No pedimos ubicacion al abrir la app.",
      iconName: "location.magnifyingglass",
      iconFallback: "GPS",
    },
    {
      title: "Reporta con datos utiles",
      body: "Agrega fotos, ubicacion aproximada y contacto seguro para que la comunidad pueda ayudar sin exponer datos de mas.",
      iconName: "doc.text.image.fill",
      iconFallback: "DAT",
    },
    {
      title: "Activa ayuda local",
      body: "Usa alertas y recursos cercanos cuando los necesites. Los permisos se explican dentro de cada flujo.",
      iconName: "bell.badge.fill",
      iconFallback: "OK",
    },
  ],
} satisfies Omit<ShellFirstRunTourModel, "shouldShow">;

export function createShellFirstRunTourStore({
  storage,
}: {
  storage: AsyncKeyValueStorage;
}): ShellFirstRunTourStore {
  return {
    hasCompleted: async () => {
      const stored = await storage.getItem(firstRunTourStorageKey);

      if (!stored) {
        return false;
      }

      try {
        const parsed = JSON.parse(stored) as { completed?: unknown };

        return parsed.completed === true;
      } catch {
        return false;
      }
    },
    markCompleted: async ({ reason }) => {
      await storage.setItem(
        firstRunTourStorageKey,
        JSON.stringify({
          completed: true,
          completedAt: new Date().toISOString(),
          reason,
        }),
      );
    },
  };
}

export function createShellFirstRunTourModel({
  shouldShow,
}: {
  shouldShow: boolean;
}): ShellFirstRunTourModel {
  return {
    completeLabel: firstRunTourCopy.completeLabel,
    nextLabel: firstRunTourCopy.nextLabel,
    shouldShow,
    skipLabel: firstRunTourCopy.skipLabel,
    stepLabel: firstRunTourCopy.stepLabel,
    steps: firstRunTourCopy.steps,
  };
}

export async function loadShellFirstRunTourModel({
  copy,
  store,
}: {
  copy: ShellCopy;
  store: ShellFirstRunTourStore;
}): Promise<ShellFirstRunTourModel> {
  void copy;

  const hasCompleted = await store.hasCompleted();

  return createShellFirstRunTourModel({ shouldShow: !hasCompleted });
}
