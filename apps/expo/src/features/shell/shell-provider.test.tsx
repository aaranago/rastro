import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ShellAuthActionResult,
  ShellAuthAdapter,
  ShellAuthSessionState,
  ShellSocialAuthProvider,
} from "./shell-auth";
import { RastroShellProvider } from "./shell-provider";

const reactState = vi.hoisted(() => ({
  value: undefined as unknown,
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useEffect: (effect: () => void) => {
      effect();
    },
    useMemo: <TValue,>(factory: () => TValue) => factory(),
    useState: <TValue,>(initialValue: TValue | (() => TValue)) => {
      if (reactState.value === undefined) {
        reactState.value =
          typeof initialValue === "function"
            ? (initialValue as () => TValue)()
            : initialValue;
      }

      const setState = (nextValue: TValue | ((current: TValue) => TValue)) => {
        reactState.value =
          typeof nextValue === "function"
            ? (nextValue as (current: TValue) => TValue)(
                reactState.value as TValue,
              )
            : nextValue;
      };

      return [reactState.value as TValue, setState];
    },
  };
});

vi.mock("../../utils/auth", () => ({
  shellAuthAdapter: {},
}));

describe("RastroShellProvider social auth handoff", () => {
  beforeEach(() => {
    reactState.value = undefined;
  });

  it("retains the selected protected report intent after successful provider auth", async () => {
    let authState: ShellAuthSessionState = {
      data: null,
      error: null,
      isPending: false,
      refetch: vi.fn(),
    };
    const socialSignIns: string[] = [];
    const authAdapter: ShellAuthAdapter = {
      availableSocialAuthProviders: ["google", "facebook"],
      createAccountWithEmail: () => Promise.resolve({ ok: true }),
      initiateAccountDeletion: () => Promise.resolve({ ok: true }),
      requestPasswordResetForEmail: () => Promise.resolve({ ok: true }),
      signInWithEmail: () => Promise.resolve({ ok: true }),
      signInWithSocialProvider: (provider) => {
        socialSignIns.push(provider);
        return Promise.resolve({ ok: true });
      },
      signOut: () => Promise.resolve({ ok: true }),
      useSession: () => authState,
    };

    let shell = renderProvider(authAdapter);

    expect(shell.socialProviderActions).toEqual([
      {
        label: "Continuar con Google",
        provider: "google",
      },
      {
        label: "Continuar con Facebook",
        provider: "facebook",
      },
    ]);

    shell.chooseReportIntent("lost");
    shell = renderProvider(authAdapter);

    expect(shell.state.authPrompt).toMatchObject({
      intent: "lost",
      selectedIntentLabel: "Reportar pérdida",
    });

    await expect(
      shell.signInWithSocialProviderFromPrompt("google"),
    ).resolves.toEqual({ ok: true });
    expect(socialSignIns).toEqual(["google"]);

    shell = renderProvider(authAdapter);
    expect(shell.state.pendingReportRouteIntent).toMatchObject({
      intent: "lost",
      label: "Reportar pérdida",
    });
    const requestId = shell.state.pendingReportRouteIntent?.requestId;

    expect(requestId).toEqual(expect.any(Number));

    authState = {
      data: {
        session: { id: "session_123" },
        user: {
          email: "ana@example.com",
          id: "member_123",
          name: "Ana",
        },
      },
      error: null,
      isPending: false,
      refetch: vi.fn(),
    };

    renderProvider(authAdapter);
    shell = renderProvider(authAdapter);

    expect(shell.state.pendingReportRouteIntent).toMatchObject({
      intent: "lost",
      label: "Reportar pérdida",
    });
    expect(shell.state.pendingReportRouteIntent?.requestId).toBe(requestId);
  });

  it("keeps the selected auth prompt recoverable with a visible error after provider cancellation", async () => {
    const cancellationMessage =
      "Cancelaste el ingreso con proveedor. Puedes intentar otra vez o usar correo y contrasena.";
    const authAdapter: ShellAuthAdapter = {
      availableSocialAuthProviders: ["google", "facebook"],
      createAccountWithEmail: () => Promise.resolve({ ok: true }),
      initiateAccountDeletion: () => Promise.resolve({ ok: true }),
      requestPasswordResetForEmail: () => Promise.resolve({ ok: true }),
      signInWithEmail: () => Promise.resolve({ ok: true }),
      signInWithSocialProvider: () =>
        Promise.resolve({
          message: cancellationMessage,
          ok: false,
          reason: "canceled",
        }),
      signOut: () => Promise.resolve({ ok: true }),
      useSession: () => ({
        data: null,
        error: null,
        isPending: false,
        refetch: vi.fn(),
      }),
    };

    let shell = renderProvider(authAdapter);

    shell.chooseReportIntent("lost");
    shell = renderProvider(authAdapter);

    expect(shell.state.authPrompt).toMatchObject({
      intent: "lost",
      selectedIntentLabel: "Reportar pérdida",
    });

    await expect(
      shell.signInWithSocialProviderFromPrompt("google"),
    ).resolves.toEqual({
      message: cancellationMessage,
      ok: false,
      reason: "canceled",
    });

    shell = renderProvider(authAdapter);

    expect(shell.state.authPrompt).toMatchObject({
      error: cancellationMessage,
      intent: "lost",
      selectedIntentLabel: "Reportar pérdida",
    });
    expect(shell.state.pendingReportRouteIntent).toBeNull();
  });

  it("requests a password reset from a logged-out auth prompt email", async () => {
    const resetEmails: string[] = [];
    const authAdapter: ShellAuthAdapter = {
      availableSocialAuthProviders: [],
      createAccountWithEmail: () => Promise.resolve({ ok: true }),
      initiateAccountDeletion: () => Promise.resolve({ ok: true }),
      requestPasswordResetForEmail: (email) => {
        resetEmails.push(email);
        return Promise.resolve({ ok: true });
      },
      signInWithEmail: () => Promise.resolve({ ok: true }),
      signInWithSocialProvider: () => Promise.resolve({ ok: true }),
      signOut: () => Promise.resolve({ ok: true }),
      useSession: () => ({
        data: null,
        error: null,
        isPending: false,
        refetch: vi.fn(),
      }),
    };

    const shell = renderProvider(authAdapter);

    await expect(
      shell.requestPasswordResetFromPrompt(" ANA@EXAMPLE.COM "),
    ).resolves.toEqual({ ok: true });

    expect(resetEmails).toEqual(["ana@example.com"]);
  });
});

interface ShellProviderValue {
  chooseReportIntent: (intent: "lost") => void;
  requestPasswordResetFromPrompt: (
    email: string,
  ) => Promise<ShellAuthActionResult>;
  signInWithSocialProviderFromPrompt: (
    provider: ShellSocialAuthProvider,
  ) => Promise<ShellAuthActionResult>;
  socialProviderActions: {
    label: string;
    provider: string;
  }[];
  state: {
    authPrompt: {
      error?: string;
      intent?: string;
      selectedIntentLabel?: string;
    } | null;
    pendingReportRouteIntent: {
      intent: string;
      label: string;
      requestId: number;
    } | null;
  };
}

function renderProvider(authAdapter: ShellAuthAdapter): ShellProviderValue {
  const node = RastroShellProvider({
    authAdapter,
    children: null,
  });

  if (!React.isValidElement<{ value: ShellProviderValue }>(node)) {
    throw new Error(
      "Expected RastroShellProvider to render a context provider.",
    );
  }

  return node.props.value;
}
