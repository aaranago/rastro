export type AccountDeletionConsequenceResource =
  | "petProfiles"
  | "reports"
  | "listings"
  | "chats"
  | "publicContent"
  | "moderationRecords";

export type AccountDeletionDisposition =
  | "delete"
  | "close"
  | "unpublish"
  | "removeContactData"
  | "retainForSafety";

export interface AccountDeletionConsequence {
  resource: AccountDeletionConsequenceResource;
  disposition: AccountDeletionDisposition;
  copy: string;
}

export interface AccountDeletionCleanupRequirement {
  id: "unsafePublicContactData";
  timing: "beforeAuthUserDelete";
  blocksAccountDeletion: true;
  copy: string;
}

export interface AccountDeletionPolicy {
  consequences: readonly AccountDeletionConsequence[];
  requiredCleanups: readonly AccountDeletionCleanupRequirement[];
}

export interface AccountDeletionCleanupInput {
  memberId: string;
  requirement: AccountDeletionCleanupRequirement;
}

export interface AccountDeletionCleanupResult {
  id: AccountDeletionCleanupRequirement["id"];
  removedRecords?: number | undefined;
  status: "completed";
}

export interface AccountDeletionCleanupBoundary {
  removeUnsafePublicContactData: (
    input: AccountDeletionCleanupInput,
  ) => Promise<AccountDeletionCleanupResult>;
}

export interface PrepareAccountDeletionInput {
  cleanup: AccountDeletionCleanupBoundary;
  memberId: string;
}

export interface AccountDeletionPreparation {
  cleanups: readonly AccountDeletionCleanupResult[];
  policy: AccountDeletionPolicy;
}

const ACCOUNT_DELETION_POLICY = {
  consequences: [
    {
      resource: "petProfiles",
      disposition: "delete",
      copy: "Tus perfiles de mascota se eliminaran junto con tu cuenta.",
    },
    {
      resource: "reports",
      disposition: "close",
      copy: "Tus reportes activos se cerraran y dejaran de aparecer en alertas comunitarias.",
    },
    {
      resource: "listings",
      disposition: "unpublish",
      copy: "Tus listados de adopcion o reubicacion se retiraran de la busqueda publica.",
    },
    {
      resource: "chats",
      disposition: "retainForSafety",
      copy: "Los chats ya no estaran disponibles para ti; Rastro puede conservar registros necesarios para seguridad y moderacion.",
    },
    {
      resource: "publicContent",
      disposition: "removeContactData",
      copy: "El contenido publico que pueda identificarte se retirara o quedara anonimo.",
    },
    {
      resource: "moderationRecords",
      disposition: "retainForSafety",
      copy: "Rastro puede conservar registros necesarios para prevenir abuso y responder a revisiones de seguridad.",
    },
  ],
  requiredCleanups: [
    {
      id: "unsafePublicContactData",
      timing: "beforeAuthUserDelete",
      blocksAccountDeletion: true,
      copy: "Rastro quitara datos publicos de contacto, como telefonos o enlaces de WhatsApp, antes de eliminar la cuenta.",
    },
  ],
} as const satisfies AccountDeletionPolicy;

export function getAccountDeletionPolicy(): AccountDeletionPolicy {
  return ACCOUNT_DELETION_POLICY;
}

export async function prepareAccountDeletion({
  cleanup,
  memberId,
}: PrepareAccountDeletionInput): Promise<AccountDeletionPreparation> {
  const policy = getAccountDeletionPolicy();
  const unsafePublicContactData = policy.requiredCleanups[0];

  if (!unsafePublicContactData) {
    throw new Error("Missing unsafe public contact data cleanup requirement");
  }

  const result = await cleanup.removeUnsafePublicContactData({
    memberId,
    requirement: unsafePublicContactData,
  });

  return {
    cleanups: [result],
    policy,
  };
}
