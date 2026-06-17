import type { ShellSession } from "./shell-model";

export interface ShellAuthSessionState {
  data:
    | {
        session?: unknown;
        user?: {
          email?: string;
          id: string;
          name?: string | null;
        } | null;
      }
    | null
    | undefined;
  error: unknown;
  isPending: boolean;
  refetch?: () => void;
}

export interface ShellAuthCredentials {
  email: string;
  name?: string;
  password: string;
}

export type ShellAuthActionResult =
  | {
      ok: true;
    }
  | {
      message?: string;
      ok: false;
    };

export type ShellAuthCredentialsResult =
  | {
      credentials: ShellAuthCredentials;
      ok: true;
    }
  | {
      ok: false;
      reason: "missing-credentials";
    };

export interface ShellAuthAdapter {
  createAccountWithEmail: (
    credentials: ShellAuthCredentials,
  ) => Promise<ShellAuthActionResult>;
  signInWithEmail: (
    credentials: ShellAuthCredentials,
  ) => Promise<ShellAuthActionResult>;
  useSession: () => ShellAuthSessionState;
}

export function deriveShellSessionFromAuthState(
  authState: ShellAuthSessionState,
): ShellSession {
  return authState.data?.user ? { kind: "member" } : { kind: "visitor" };
}

export function prepareShellAuthCredentials({
  email,
  name,
  password,
}: ShellAuthCredentials): ShellAuthCredentialsResult {
  const displayName = name?.trim();
  const hasDisplayName =
    typeof displayName === "string" && displayName.length > 0;
  const credentials = {
    email: email.trim().toLowerCase(),
    name: hasDisplayName ? displayName : undefined,
    password,
  };

  if (!credentials.email || !credentials.password.trim()) {
    return {
      ok: false,
      reason: "missing-credentials",
    };
  }

  return {
    credentials,
    ok: true,
  };
}
