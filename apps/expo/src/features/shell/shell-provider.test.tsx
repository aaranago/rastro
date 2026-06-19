import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShellAuthAdapter, ShellAuthSessionState } from "./shell-auth";
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
      selectedIntentLabel: "Reportar perdida",
    });

    await expect(
      shell.signInWithSocialProviderFromPrompt("google"),
    ).resolves.toEqual({ ok: true });
    expect(socialSignIns).toEqual(["google"]);

    shell = renderProvider(authAdapter);
    expect(shell.state.pendingMemberIntent).toEqual({
      intent: "lost",
      label: "Reportar perdida",
    });

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

    expect(shell.state.pendingMemberIntent).toBeNull();
    expect(shell.state.memberIntent).toEqual({
      intent: "lost",
      label: "Reportar perdida",
    });
  });
});

interface ShellProviderValue {
  chooseReportIntent: (intent: "lost") => void;
  signInWithSocialProviderFromPrompt: (
    provider: "google",
  ) => Promise<{ ok: boolean }>;
  socialProviderActions: {
    label: string;
    provider: string;
  }[];
  state: {
    authPrompt: {
      intent?: string;
      selectedIntentLabel?: string;
    } | null;
    memberIntent: {
      intent: string;
      label: string;
    } | null;
    pendingMemberIntent: {
      intent: string;
      label: string;
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
