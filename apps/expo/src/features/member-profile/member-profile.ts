const memberProfileDefaultContactPreferences = [
  "in_app_chat",
  "whatsapp",
  "both",
] as const;

export type MemberProfileDefaultContactPreference =
  (typeof memberProfileDefaultContactPreferences)[number];

export interface MemberProfileSettings {
  defaultContactPreference: MemberProfileDefaultContactPreference;
  displayName: string;
  memberId: string;
  phone: string | null;
  updatedAt?: string;
  whatsapp: string | null;
}

export interface MemberProfileSettingsDraft {
  defaultContactPreference: string;
  displayName: string;
  phone: string;
  whatsapp: string;
}

export interface MemberProfileSettingsUpdateInput {
  defaultContactPreference: MemberProfileDefaultContactPreference;
  displayName: string;
  phone?: string | null;
  whatsapp?: string | null;
}

export type MemberProfileSessionState =
  | MemberProfileMemberSession
  | { kind: "visitor" };

export interface MemberProfileMemberSession {
  displayName?: string;
  email?: string;
  kind: "member";
  memberId: string;
}

export interface MemberProfileRepository {
  getSettings: (
    session: MemberProfileSessionState,
  ) => Promise<MemberProfileSettings>;
  updateSettings: (
    session: MemberProfileSessionState,
    input: MemberProfileSettingsUpdateInput,
  ) => Promise<MemberProfileSettings>;
}

export interface MemberProfileValidationResult {
  errors: readonly string[];
  input?: MemberProfileSettingsUpdateInput;
  ok: boolean;
}

export function createMemberProfileSettingsDraft(
  settings: MemberProfileSettings,
): MemberProfileSettingsDraft {
  return {
    defaultContactPreference: settings.defaultContactPreference,
    displayName: settings.displayName,
    phone: settings.phone ?? "",
    whatsapp: settings.whatsapp ?? "",
  };
}

export function validateMemberProfileSettingsDraft(
  draft: MemberProfileSettingsDraft,
): MemberProfileValidationResult {
  const errors: string[] = [];
  const displayName = draft.displayName.trim();
  const phone = optionalNormalizedContactPhone(draft.phone);
  const whatsapp = optionalNormalizedContactPhone(draft.whatsapp);
  const defaultContactPreference = draft.defaultContactPreference;

  if (!displayName) {
    errors.push("Ingresa tu nombre público.");
  }

  if (!isSupportedDefaultContactPreference(defaultContactPreference)) {
    errors.push("Elige un método de contacto válido.");
  }

  if (phone !== null && !isValidContactPhone(phone)) {
    errors.push("Ingresa un teléfono válido.");
  }

  if (whatsapp !== null && !isValidContactPhone(whatsapp)) {
    errors.push("Ingresa un WhatsApp válido.");
  }

  if (defaultContactPreference !== "in_app_chat" && whatsapp === null) {
    errors.push("Ingresa un WhatsApp para usarlo como contacto.");
  }

  if (
    errors.length > 0 ||
    !isSupportedDefaultContactPreference(defaultContactPreference)
  ) {
    return {
      errors,
      ok: false,
    };
  }

  return {
    errors,
    input: {
      defaultContactPreference,
      displayName,
      phone,
      whatsapp,
    },
    ok: true,
  };
}

export function getMemberProfileLoadFailureMessage(error: unknown) {
  if (isOfflineError(error)) {
    return "No pudimos cargar tus ajustes. Revisa tu conexión e intenta de nuevo.";
  }

  return "No pudimos cargar tus ajustes desde Rastro. Intenta de nuevo.";
}

export function getMemberProfileSaveFailureMessage(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  if (code === "UNAUTHORIZED") {
    return "Inicia sesión de nuevo para guardar tus ajustes.";
  }

  if (
    code === "BAD_REQUEST" ||
    message.includes("validation") ||
    message.includes("invalid")
  ) {
    return "No pudimos validar los datos. Revisa tu nombre y teléfonos.";
  }

  if (isOfflineError(error)) {
    return "No pudimos guardar tus ajustes. Revisa tu conexión e intenta de nuevo.";
  }

  return "No pudimos guardar tus ajustes. Intenta de nuevo.";
}

export function isSupportedDefaultContactPreference(
  value: unknown,
): value is MemberProfileDefaultContactPreference {
  return memberProfileDefaultContactPreferences.includes(
    value as MemberProfileDefaultContactPreference,
  );
}

export function assertMemberProfileSession(
  session: MemberProfileSessionState,
): MemberProfileMemberSession {
  if (session.kind === "visitor") {
    throw new Error("Inicia sesión para administrar tus ajustes.");
  }

  return session;
}

function optionalTrimmed(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function optionalNormalizedContactPhone(value: string) {
  const trimmed = optionalTrimmed(value);

  return trimmed === null ? null : normalizeMemberProfileContactPhone(trimmed);
}

export function normalizeMemberProfileContactPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("591")) {
    return `+591 ${digits.slice(3)}`;
  }

  return trimmed;
}

function isValidContactPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  return (
    digits.length >= 7 &&
    digits.length <= 15 &&
    /^\+?[0-9][0-9 ().-]*[0-9]$/.test(value)
  );
}

function isOfflineError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("fetch") ||
    message.includes("conexion")
  );
}

function getErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  if (typeof error.code === "string") {
    return error.code;
  }

  return (
    getNestedString(error.data, "code") ??
    getNestedString(error.shape, "code") ??
    getErrorCode(error.cause)
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return [
      error.message,
      isRecord(error) ? getNestedString(error.data, "message") : undefined,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (typeof error === "string") {
    return error;
  }

  if (!isRecord(error)) {
    return "";
  }

  return [
    typeof error.message === "string" ? error.message : undefined,
    getNestedString(error.data, "message"),
    getNestedString(error.shape, "message"),
    getErrorMessage(error.cause),
  ]
    .filter(Boolean)
    .join(" ");
}

function getNestedString(
  value: unknown,
  key: "code" | "message",
): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return typeof value[key] === "string" ? value[key] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
