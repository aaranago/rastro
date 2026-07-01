import * as React from "react";

import type { ReportIntent, ShellCopy } from "../../i18n";
import type {
  ShellAuthActionResult,
  ShellAuthAdapter,
  ShellAuthCredentials,
  ShellSocialAuthAction,
  ShellSocialAuthProvider,
} from "./shell-auth";
import type {
  ShellAuthPromptRequest,
  ShellModel,
  ShellReportAction,
  ShellSession,
  ShellState,
} from "./shell-model";
import { getShellCopy } from "../../i18n";
import { shellAuthAdapter } from "../../utils/auth";
import {
  deriveShellSessionFromAuthState,
  shellSocialAuthProviders,
} from "./shell-auth";
import {
  chooseReportAction,
  clearPendingReportRouteIntent as clearPendingReportRouteIntentState,
  completeAuthPromptWithPendingReportRouteIntent,
  continueReportActionAsMember,
  createInitialShellState,
  createShellModel,
  promotePendingReportRouteIntentForSession,
  requestShellAuthPrompt,
} from "./shell-model";

interface RastroShellContextValue {
  copy: ShellCopy;
  model: ShellModel;
  session: ShellSession;
  state: ShellState;
  socialProviderActions: ShellSocialAuthAction[];
  clearPendingReportRouteIntent: (requestId?: number) => void;
  clearAuthReturnTo: () => void;
  requestAuthPrompt: (request?: ShellAuthPromptRequest) => void;
  openReportActions: () => void;
  closeReportActions: () => void;
  chooseReportIntent: (intent: ReportIntent) => void;
  dismissAuthPrompt: () => void;
  signInFromPrompt: (
    credentials: ShellAuthCredentials,
  ) => Promise<ShellAuthActionResult>;
  signInWithSocialProviderFromPrompt: (
    provider: ShellSocialAuthProvider,
  ) => Promise<ShellAuthActionResult>;
  createAccountFromPrompt: (
    credentials: ShellAuthCredentials,
  ) => Promise<ShellAuthActionResult>;
  requestPasswordResetFromPrompt: (
    email: string,
  ) => Promise<ShellAuthActionResult>;
  requestMemberPasswordReset: () => Promise<ShellAuthActionResult>;
  initiateAccountDeletion: () => Promise<ShellAuthActionResult>;
  signOutMember: () => Promise<ShellAuthActionResult>;
  refreshSession: () => void;
  continueAsVisitor: () => void;
}

const RastroShellContext = React.createContext<RastroShellContextValue | null>(
  null,
);

function findReportAction(
  model: ShellModel,
  intent: ReportIntent,
): ShellReportAction {
  const action = model.reportActions.find((item) => item.intent === intent);

  if (!action) {
    throw new Error(`Unknown report intent: ${intent}`);
  }

  return action;
}

function clearAuthPromptError(state: ShellState): ShellState {
  if (!state.authPrompt?.error) {
    return state;
  }

  const { error: _error, ...authPrompt } = state.authPrompt;

  return {
    ...state,
    authPrompt,
  };
}

function showAuthPromptError(state: ShellState, message: string): ShellState {
  if (!state.authPrompt) {
    return state;
  }

  return {
    ...state,
    authPrompt: {
      ...state.authPrompt,
      error: message,
    },
  };
}

export function RastroShellProvider({
  authAdapter = shellAuthAdapter,
  children,
}: {
  authAdapter?: ShellAuthAdapter;
  children: React.ReactNode;
}) {
  const copy = React.useMemo(() => getShellCopy(), []);
  const authSession = authAdapter.useSession();
  const refetchAuthSession = authSession.refetch;
  const modelSession = deriveShellSessionFromAuthState(authSession);
  const session = React.useMemo<ShellSession>(
    () =>
      modelSession.kind === "loading" ? { kind: "visitor" } : modelSession,
    [modelSession],
  );
  const [state, setState] = React.useState(createInitialShellState);

  const model = React.useMemo(
    () => createShellModel({ copy, session: modelSession }),
    [copy, modelSession],
  );
  const socialProviderActions = React.useMemo<ShellSocialAuthAction[]>(() => {
    const availableProviders = new Set(
      authAdapter.availableSocialAuthProviders,
    );

    return shellSocialAuthProviders
      .filter((provider) => availableProviders.has(provider))
      .map((provider) => ({
        label: copy.authPrompt.socialProviderLabels[provider],
        provider,
      }));
  }, [authAdapter.availableSocialAuthProviders, copy]);

  React.useEffect(() => {
    setState((current) =>
      promotePendingReportRouteIntentForSession(current, modelSession),
    );
  }, [modelSession]);

  const openReportActions = React.useCallback(() => {
    setState((current) => ({
      ...current,
      activeSheet: "report-actions",
      authPrompt: null,
    }));
  }, []);

  const closeReportActions = React.useCallback(() => {
    setState((current) => ({
      ...current,
      activeSheet: null,
    }));
  }, []);

  const chooseReportIntent = React.useCallback(
    (intent: ReportIntent) => {
      const action = findReportAction(model, intent);

      setState((current) =>
        session.kind === "member"
          ? continueReportActionAsMember(current, action)
          : chooseReportAction(current, action, copy),
      );
    },
    [copy, model, session.kind],
  );

  const requestAuthPrompt = React.useCallback(
    (request: ShellAuthPromptRequest = {}) => {
      setState((current) =>
        session.kind === "member" && request.returnTo
          ? {
              ...current,
              activeSheet: null,
              authReturnTo: request.returnTo,
              authPrompt: null,
              pendingReportRouteIntent: null,
            }
          : requestShellAuthPrompt(current, copy, request),
      );
    },
    [copy, session.kind],
  );

  const dismissAuthPrompt = React.useCallback(() => {
    setState((current) => ({
      ...current,
      authPrompt: null,
    }));
  }, []);

  const continueAsVisitor = React.useCallback(() => {
    setState((current) => ({
      ...current,
      authPrompt: null,
    }));
  }, []);

  const clearPendingReportRouteIntent = React.useCallback(
    (requestId?: number) => {
      setState((current) =>
        clearPendingReportRouteIntentState(current, requestId),
      );
    },
    [],
  );

  const clearAuthReturnTo = React.useCallback(() => {
    setState((current) => ({
      ...current,
      authReturnTo: null,
    }));
  }, []);

  const completeAuthPrompt = React.useCallback(() => {
    refetchAuthSession?.();
    setState(completeAuthPromptWithPendingReportRouteIntent);
  }, [refetchAuthSession]);

  const refreshSession = React.useCallback(() => {
    refetchAuthSession?.();
  }, [refetchAuthSession]);

  const signInFromPrompt = React.useCallback(
    async (credentials: ShellAuthCredentials) => {
      const result = await authAdapter.signInWithEmail(credentials);

      if (result.ok) {
        completeAuthPrompt();
      }

      return result;
    },
    [authAdapter, completeAuthPrompt],
  );

  const createAccountFromPrompt = React.useCallback(
    async (credentials: ShellAuthCredentials) => {
      const result = await authAdapter.createAccountWithEmail(credentials);

      if (result.ok) {
        completeAuthPrompt();
      }

      return result;
    },
    [authAdapter, completeAuthPrompt],
  );

  const signInWithSocialProviderFromPrompt = React.useCallback(
    async (
      provider: ShellSocialAuthProvider,
    ): Promise<ShellAuthActionResult> => {
      setState(clearAuthPromptError);

      if (!authAdapter.availableSocialAuthProviders.includes(provider)) {
        const result = {
          message: copy.authPrompt.socialProviderUnavailable,
          ok: false,
          reason: "unavailable",
        } as const;

        setState((current) => showAuthPromptError(current, result.message));

        return result;
      }

      const result = await authAdapter.signInWithSocialProvider(provider);

      if (result.ok) {
        completeAuthPrompt();
      } else {
        setState((current) =>
          showAuthPromptError(
            current,
            result.message ?? copy.authPrompt.authFailed,
          ),
        );
      }

      return result;
    },
    [
      authAdapter,
      completeAuthPrompt,
      copy.authPrompt.authFailed,
      copy.authPrompt.socialProviderUnavailable,
    ],
  );

  const requestMemberPasswordReset =
    React.useCallback(async (): Promise<ShellAuthActionResult> => {
      if (session.kind !== "member" || !session.email) {
        return {
          message: copy.screens.profile.account.passwordResetUnavailable,
          ok: false,
        };
      }

      return authAdapter.requestPasswordResetForEmail(session.email);
    }, [authAdapter, copy, session]);

  const requestPasswordResetFromPrompt = React.useCallback(
    async (email: string): Promise<ShellAuthActionResult> => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        return {
          message: copy.authPrompt.missingCredentials,
          ok: false,
        };
      }

      return authAdapter.requestPasswordResetForEmail(normalizedEmail);
    },
    [authAdapter, copy.authPrompt.missingCredentials],
  );

  const initiateAccountDeletion =
    React.useCallback(async (): Promise<ShellAuthActionResult> => {
      if (session.kind !== "member") {
        return {
          message: copy.screens.profile.account.actionFailed,
          ok: false,
        };
      }

      const result = await authAdapter.initiateAccountDeletion();

      if (result.ok) {
        refetchAuthSession?.();
      }

      return result;
    }, [authAdapter, copy, refetchAuthSession, session.kind]);

  const signOutMember =
    React.useCallback(async (): Promise<ShellAuthActionResult> => {
      if (session.kind !== "member") {
        return {
          message: copy.screens.profile.account.actionFailed,
          ok: false,
        };
      }

      const result = await authAdapter.signOut();

      if (result.ok) {
        refetchAuthSession?.();
        setState((current) => ({
          ...current,
          authPrompt: null,
          pendingReportRouteIntent: null,
        }));
      }

      return result;
    }, [authAdapter, copy, refetchAuthSession, session.kind]);

  const value = React.useMemo<RastroShellContextValue>(
    () => ({
      copy,
      model,
      session,
      state,
      socialProviderActions,
      clearAuthReturnTo,
      clearPendingReportRouteIntent,
      openReportActions,
      closeReportActions,
      chooseReportIntent,
      requestAuthPrompt,
      dismissAuthPrompt,
      signInFromPrompt,
      signInWithSocialProviderFromPrompt,
      createAccountFromPrompt,
      requestPasswordResetFromPrompt,
      requestMemberPasswordReset,
      initiateAccountDeletion,
      signOutMember,
      refreshSession,
      continueAsVisitor,
    }),
    [
      chooseReportIntent,
      clearAuthReturnTo,
      clearPendingReportRouteIntent,
      closeReportActions,
      continueAsVisitor,
      copy,
      createAccountFromPrompt,
      dismissAuthPrompt,
      initiateAccountDeletion,
      model,
      openReportActions,
      refreshSession,
      requestAuthPrompt,
      requestMemberPasswordReset,
      requestPasswordResetFromPrompt,
      session,
      signInFromPrompt,
      signInWithSocialProviderFromPrompt,
      signOutMember,
      socialProviderActions,
      state,
    ],
  );

  return (
    <RastroShellContext.Provider value={value}>
      {children}
    </RastroShellContext.Provider>
  );
}

export function useRastroShell() {
  const value = React.use(RastroShellContext);

  if (!value) {
    throw new Error("useRastroShell must be used inside RastroShellProvider");
  }

  return value;
}
