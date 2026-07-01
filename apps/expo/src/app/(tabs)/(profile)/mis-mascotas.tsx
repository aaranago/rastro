import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";

import type {
  PetProfileRelatedRecord,
  PetProfilesSessionState,
} from "~/features/pet-profiles/pet-profile-types";
import type { ShellSession } from "~/features/shell/shell-model";
import { createApiPetProfileRepository } from "~/features/pet-profiles/api-pet-profile-repository";
import { createNativePetProfilePhotoPicker } from "~/features/pet-profiles/native-pet-profile-photo-source";
import {
  buildPetProfileRelatedRecordHref,
  buildPetProfileReportCreationHref,
} from "~/features/pet-profiles/pet-profile-navigation";
import { MisMascotasScreen } from "~/features/pet-profiles/pet-profiles-screen";
import { createCreationDraftStore } from "~/features/resilience/creation-drafts";
import { createExpoSecureStoreKeyValueStorage } from "~/features/resilience/storage";
import { useRastroShell } from "~/features/shell/shell-provider";
import { trpcClient } from "~/utils/api";

export default function MisMascotasRoute() {
  const { session } = useRastroShell();
  const router = useRouter();
  const draftStore = useMemo(
    () =>
      createCreationDraftStore({
        storage: createExpoSecureStoreKeyValueStorage(),
      }),
    [],
  );
  const repository = useMemo(
    () => createApiPetProfileRepository({ client: trpcClient }),
    [],
  );
  const requestPetProfilePhoto = useMemo(
    () => createNativePetProfilePhotoPicker(),
    [],
  );
  const startReportFromProfile = useCallback(
    (
      profileId: string,
      intent: "lost" | "found" | "sighting" | "adoption",
    ) => {
      router.push(buildPetProfileReportCreationHref({ intent, profileId }));
    },
    [router],
  );
  const openRelatedRecord = useCallback(
    (record: PetProfileRelatedRecord) => {
      router.push(buildPetProfileRelatedRecordHref(record));
    },
    [router],
  );

  return (
    <MisMascotasScreen
      draftScopeId={session.kind === "member" ? session.id : undefined}
      draftStore={draftStore}
      onOpenRelatedRecord={openRelatedRecord}
      onRequestAddPhoto={requestPetProfilePhoto}
      onStartReportFromProfile={startReportFromProfile}
      repository={repository}
      session={toPetProfilesSession(session)}
    />
  );
}

function toPetProfilesSession(session: ShellSession): PetProfilesSessionState {
  if (session.kind === "visitor") {
    return {
      kind: "visitor",
    };
  }

  return {
    displayName: session.name ?? session.email ?? undefined,
    kind: "member",
    memberId: session.id,
  };
}
