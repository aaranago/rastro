import * as React from "react";

import type { ReportIntent, ShellCopy } from "../../i18n";
import type {
  ShellAuthActionResult,
  ShellAuthAdapter,
  ShellAuthCredentials,
} from "./shell-auth";
import type {
  ShellModel,
  ShellReportAction,
  ShellSession,
  ShellState,
} from "./shell-model";
import { shellAuthAdapter } from "~/utils/auth";
import { getShellCopy } from "../../i18n";
import { deriveShellSessionFromAuthState } from "./shell-auth";
import {
  chooseReportAction,
  continueReportActionAsMember,
  createInitialShellState,
  createShellModel,
} from "./shell-model";

interface RastroShellContextValue {
  copy: ShellCopy;
  model: ShellModel;
  session: ShellSession;
  state: ShellState;
  clearMemberIntent: () => void;
  openReportActions: () => void;
  closeReportActions: () => void;
  chooseReportIntent: (intent: ReportIntent) => void;
  dismissAuthPrompt: () => void;
  signInFromPrompt: (
    credentials: ShellAuthCredentials,
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
  const session = deriveShellSessionFromAuthState(authSession);
  const [state, setState] = React.useState(createInitialShellState);

  const model = React.useMemo(
    () => createShellModel({ copy, session }),
    [copy, session],
  );

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
    }));
  }, []);

  const completeAuthPrompt = React.useCallback(() => {
    refetchAuthSession?.();
    setState((current) => ({
      ...current,
      authPrompt: null,
      memberIntent: current.authPrompt
        ? {
            intent: current.authPrompt.intent,
            label: current.authPrompt.selectedIntentLabel,
          }
        : current.memberIntent,
    }));
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
      clearMemberIntent,
      openReportActions,
      closeReportActions,
      chooseReportIntent,
      dismissAuthPrompt,
      signInFromPrompt,
      createAccountFromPrompt,
      requestMemberPasswordReset,
      initiateAccountDeletion,
      signOutMember,
      continueAsVisitor,
    }),
    [
      chooseReportIntent,
      clearMemberIntent,
      closeReportActions,
      continueAsVisitor,
      copy,
      createAccountFromPrompt,
      dismissAuthPrompt,
      initiateAccountDeletion,
      model,
      openReportActions,
      requestMemberPasswordReset,
      session,
      signInFromPrompt,
      signOutMember,
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
