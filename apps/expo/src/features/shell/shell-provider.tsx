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
  completeAuthPromptWithPendingMemberIntent,
  continueReportActionAsMember,
  createInitialShellState,
  createShellModel,
  promotePendingMemberIntentForSession,
  requestShellAuthPrompt,
} from "./shell-model";

interface RastroShellContextValue {
  copy: ShellCopy;
  model: ShellModel;
  session: ShellSession;
  state: ShellState;
  socialProviderActions: ShellSocialAuthAction[];
  clearMemberIntent: () => void;
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
  requestMemberPasswordReset: () => Promise<ShellAuthActionResult>;
  initiateAccountDeletion: () => Promise<ShellAuthActionResult>;
  signOutMember: () => Promise<ShellAuthActionResult>;
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
      promotePendingMemberIntentForSession(current, modelSession),
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

  const clearMemberIntent = React.useCallback(() => {
    setState((current) => ({
      ...current,
      memberIntent: null,
      pendingMemberIntent: null,
    }));
  }, []);

  const clearAuthReturnTo = React.useCallback(() => {
    setState((current) => ({
      ...current,
      authReturnTo: null,
    }));
  }, []);

  const completeAuthPrompt = React.useCallback(() => {
    refetchAuthSession?.();
    setState(completeAuthPromptWithPendingMemberIntent);
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
      if (!authAdapter.availableSocialAuthProviders.includes(provider)) {
        return {
          message: copy.authPrompt.socialProviderUnavailable,
          ok: false,
          reason: "unavailable",
        };
      }

      const result = await authAdapter.signInWithSocialProvider(provider);

      if (result.ok) {
        completeAuthPrompt();
      }

      return result;
    },
    [
      authAdapter,
      completeAuthPrompt,
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
          memberIntent: null,
          pendingMemberIntent: null,
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
      clearMemberIntent,
      openReportActions,
      closeReportActions,
      chooseReportIntent,
      requestAuthPrompt,
      dismissAuthPrompt,
      signInFromPrompt,
      signInWithSocialProviderFromPrompt,
      createAccountFromPrompt,
      requestMemberPasswordReset,
      initiateAccountDeletion,
      signOutMember,
      continueAsVisitor,
    }),
    [
      chooseReportIntent,
      clearAuthReturnTo,
      clearMemberIntent,
      closeReportActions,
      continueAsVisitor,
      copy,
      createAccountFromPrompt,
      dismissAuthPrompt,
      initiateAccountDeletion,
      model,
      openReportActions,
      requestAuthPrompt,
      requestMemberPasswordReset,
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
