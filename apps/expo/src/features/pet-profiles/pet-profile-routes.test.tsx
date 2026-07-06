import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShellSession } from "../shell/shell-model";
import MisMascotasRoute from "../../app/(tabs)/(profile)/mis-mascotas";

(globalThis as { React?: typeof React }).React = React;

const router = vi.hoisted(() => ({
  push: vi.fn(),
}));

const shell = vi.hoisted(() => ({
  requestAuthPrompt: vi.fn(),
  session: { kind: "visitor" } as ShellSession,
}));

const api = vi.hoisted(() => ({
  trpcClient: {},
}));

const petProfiles = vi.hoisted(() => ({
  capturedProps: null as Record<string, unknown> | null,
  createApiPetProfileRepository: vi.fn(),
  createNativePetProfilePhotoPicker: vi.fn(),
  photoPicker: vi.fn(),
  repository: {
    createPetProfile: vi.fn(),
    listPetProfiles: vi.fn(),
    updatePetProfile: vi.fn(),
  },
}));

const drafts = vi.hoisted(() => ({
  createCreationDraftStore: vi.fn(),
  draftStore: {},
}));

const storage = vi.hoisted(() => ({
  createExpoSecureStoreKeyValueStorage: vi.fn(),
  storage: {},
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useMemo: <TValue,>(factory: () => TValue) => factory(),
  };
});

vi.mock("expo-router", () => ({
  useRouter: () => router,
}));

vi.mock("~/features/shell/shell-provider", () => ({
  useRastroShell: () => shell,
}));

vi.mock("~/utils/api", () => ({
  trpcClient: api.trpcClient,
}));

vi.mock("~/features/pet-profiles/api-pet-profile-repository", () => {
  petProfiles.createApiPetProfileRepository.mockReturnValue(
    petProfiles.repository,
  );

  return {
    createApiPetProfileRepository:
      petProfiles.createApiPetProfileRepository,
  };
});

vi.mock("~/features/pet-profiles/native-pet-profile-photo-source", () => {
  petProfiles.createNativePetProfilePhotoPicker.mockReturnValue(
    petProfiles.photoPicker,
  );

  return {
    createNativePetProfilePhotoPicker:
      petProfiles.createNativePetProfilePhotoPicker,
  };
});

vi.mock("~/features/pet-profiles/pet-profile-navigation", () => ({
  buildPetProfileRelatedRecordHref: vi.fn(
    (record: { id: string }) => `/related/${record.id}`,
  ),
  buildPetProfileReportCreationHref: vi.fn(
    ({ intent, profileId }: { intent: string; profileId: string }) =>
      `/report-create/${intent}?petProfileId=${profileId}`,
  ),
}));

vi.mock("~/features/pet-profiles/pet-profiles-screen", () => ({
  MisMascotasScreen: (props: Record<string, unknown>) => {
    petProfiles.capturedProps = props;

    return React.createElement("MisMascotasScreen", props);
  },
}));

vi.mock("~/features/resilience/creation-drafts", () => {
  drafts.createCreationDraftStore.mockReturnValue(drafts.draftStore);

  return {
    createCreationDraftStore: drafts.createCreationDraftStore,
  };
});

vi.mock("~/features/resilience/storage", () => {
  storage.createExpoSecureStoreKeyValueStorage.mockReturnValue(storage.storage);

  return {
    createExpoSecureStoreKeyValueStorage:
      storage.createExpoSecureStoreKeyValueStorage,
  };
});

describe("MisMascotasRoute", () => {
  beforeEach(() => {
    petProfiles.capturedProps = null;
    router.push.mockReset();
    shell.requestAuthPrompt.mockReset();
    shell.session = { kind: "visitor" } as ShellSession;
  });

  it("preserves the Mis mascotas return path when visitors sign in", () => {
    void renderFunctionElement(<MisMascotasRoute />);

    const onRequestSignIn = petProfiles.capturedProps
      ?.onRequestSignIn as (() => void) | undefined;
    onRequestSignIn?.();

    expect(shell.requestAuthPrompt).toHaveBeenCalledWith({
      returnTo: "/(tabs)/(profile)/mis-mascotas",
      sourceHref:
        "rastro://auth/sign-in?returnTo=%2F(tabs)%2F(profile)%2Fmis-mascotas",
    });
  });
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

function renderFunctionElement(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<ElementProps>(node)) {
    return node;
  }

  if (typeof node.type !== "function") {
    return node;
  }

  const Component = node.type as (props: ElementProps) => React.ReactNode;

  return renderFunctionElement(Component(node.props));
}
