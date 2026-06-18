export type AccountClientActionResult =
  | {
      ok: true;
    }
  | {
      message?: string | undefined;
      ok: false;
    };

export interface BetterAuthClientResult<TData> {
  data?: TData | null | undefined;
  error?:
    | {
        message?: string | undefined;
      }
    | null
    | undefined;
}

export interface AccountDeletionRequestInput {
  callbackURL?: string | undefined;
  password?: string | undefined;
  token?: string | undefined;
}

export interface PasswordResetRequestInput {
  redirectTo?: string | undefined;
}

export interface BetterAuthAccountClient {
  deleteUser: (
    input: AccountDeletionRequestInput,
  ) => Promise<BetterAuthClientResult<{ success: boolean }>>;
  requestPasswordReset: (input: {
    email: string;
    redirectTo?: string | undefined;
  }) => Promise<BetterAuthClientResult<{ status: boolean }>>;
  signOut: () => Promise<BetterAuthClientResult<{ success: boolean }>>;
}

export interface AccountClientAdapter {
  initiateAccountDeletion: (
    input?: AccountDeletionRequestInput,
  ) => Promise<AccountClientActionResult>;
  requestPasswordResetForEmail: (
    email: string,
    input?: PasswordResetRequestInput,
  ) => Promise<AccountClientActionResult>;
  signOut: () => Promise<AccountClientActionResult>;
}

function normalizeClientResult<TData>(
  result: BetterAuthClientResult<TData>,
  isSuccessful: (data: TData | null | undefined) => boolean,
): AccountClientActionResult {
  if (result.error) {
    return {
      message: result.error.message,
      ok: false,
    };
  }

  if (!isSuccessful(result.data)) {
    return {
      ok: false,
    };
  }

  return { ok: true };
}

function getPasswordResetInput(
  email: string,
  input: PasswordResetRequestInput | undefined,
) {
  const request: { email: string; redirectTo?: string | undefined } = {
    email: email.trim().toLowerCase(),
  };

  if (input?.redirectTo) {
    request.redirectTo = input.redirectTo;
  }

  return request;
}

export function createAccountClientAdapter(
  client: BetterAuthAccountClient,
): AccountClientAdapter {
  return {
    async initiateAccountDeletion(input) {
      return normalizeClientResult(
        await client.deleteUser(input ?? {}),
        (data) => data?.success === true,
      );
    },
    async requestPasswordResetForEmail(email, input) {
      const request = getPasswordResetInput(email, input);

      if (!request.email) {
        return {
          message: "Ingresa tu correo electronico.",
          ok: false,
        };
      }

      return normalizeClientResult(
        await client.requestPasswordReset(request),
        (data) => data?.status === true,
      );
    },
    async signOut() {
      return normalizeClientResult(
        await client.signOut(),
        (data) => data?.success === true,
      );
    },
  };
}
