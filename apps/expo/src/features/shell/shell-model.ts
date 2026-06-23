import type { ReportIntent, ShellCopy, ShellTabKey } from "../../i18n";
import type { AppStateCatalog } from "../app-states";

export interface ShellLoadingSession {
  kind: "loading";
}

export type ShellSession =
  | {
      kind: "visitor";
    }
  | {
      email?: string;
      id: string;
      kind: "member";
      name?: string | null;
    };

export type ShellModelSession = ShellLoadingSession | ShellSession;

export interface ShellTab {
  key: ShellTabKey;
  routeName: "(nearby)" | "(activity)" | "(resources)" | "(profile)";
  label: string;
  icon: {
    sf: string;
    selectedSf: string;
    drawable: string;
  };
}

export interface ShellReportAction {
  intent: ReportIntent;
  label: string;
  memberOnly: boolean;
  icon: string;
  tone: "lost" | "found" | "sighting" | "adoption";
}

export interface ShellModel {
  appStates: AppStateCatalog;
  brand: ShellCopy["brand"];
  locale: ShellCopy["locale"];
  session: ShellModelSession;
  tabs: ShellTab[];
  reportActions: ShellReportAction[];
}

export interface ShellProfileAccountSettings {
  deletionAction: string;
  deletionBody: string;
  deletionImpacts: string[];
  deletionPending: string;
  deletionSuccess: string;
  deletionTitle: string;
  email?: string;
  emailLabel: string;
  passwordResetAction: string;
  passwordResetBody?: string;
  passwordResetPending: string;
  passwordResetSuccess: string;
  passwordResetTitle: string;
  passwordResetUnavailable: string;
  signOutAction: string;
  signOutPending: string;
  title: string;
}

export interface ShellProfileModel {
  accountSettings: ShellProfileAccountSettings | null;
  body: string;
  isMember: boolean;
  title: string;
}

export interface ShellAuthPrompt {
  error?: string;
  intent?: ReportIntent;
  reportRouteRequestId?: number;
  returnTo?: string;
  selectedIntentLabel?: string;
  title: string;
  body: string;
}

export interface ShellAuthPromptRequest {
  returnTo?: string;
  sourceHref?: string;
}

export interface ShellReportRouteIntent
  extends Pick<ShellReportAction, "intent" | "label"> {
  requestId: number;
}

export interface ShellState {
  activeSheet: "report-actions" | null;
  authReturnTo: string | null;
  authPrompt: ShellAuthPrompt | null;
  pendingReportRouteIntent: ShellReportRouteIntent | null;
}

export interface ShellMemberCreationSession {
  displayName?: string;
  kind: "member";
  memberId: string;
}

const tabs = [
  {
    key: "nearby",
    routeName: "(nearby)",
    icon: {
      sf: "location",
      selectedSf: "location.fill",
      drawable: "ic_menu_mylocation",
    },
  },
  {
    key: "activity",
    routeName: "(activity)",
    icon: {
      sf: "bell",
      selectedSf: "bell.fill",
      drawable: "ic_dialog_info",
    },
  },
  {
    key: "resources",
    routeName: "(resources)",
    icon: {
      sf: "book",
      selectedSf: "book.fill",
      drawable: "ic_menu_agenda",
    },
  },
  {
    key: "profile",
    routeName: "(profile)",
    icon: {
      sf: "person",
      selectedSf: "person.fill",
      drawable: "ic_menu_myplaces",
    },
  },
] as const satisfies readonly {
  key: ShellTabKey;
  routeName: ShellTab["routeName"];
  icon: ShellTab["icon"];
}[];

const reportActions = [
  {
    intent: "lost",
    icon: "megaphone.fill",
    tone: "lost",
  },
  {
    intent: "found",
    icon: "checkmark.seal.fill",
    tone: "found",
  },
  {
    intent: "sighting",
    icon: "eye.fill",
    tone: "sighting",
  },
  {
    intent: "adoption",
    icon: "heart.fill",
    tone: "adoption",
  },
] as const satisfies readonly {
  intent: ReportIntent;
  icon: string;
  tone: ShellReportAction["tone"];
}[];

const mainTabRouteSegments = new Set([
  "(nearby)",
  "(activity)",
  "(resources)",
  "(profile)",
]);

let nextReportRouteRequestId = 1;

function createShellReportRouteRequestId(): number {
  return nextReportRouteRequestId++;
}

function createShellReportRouteIntent(
  action: Pick<ShellReportAction, "intent" | "label">,
  requestId = createShellReportRouteRequestId(),
): ShellReportRouteIntent {
  return {
    intent: action.intent,
    label: action.label,
    requestId,
  };
}

export function createInitialShellState(): ShellState {
  return {
    activeSheet: null,
    authReturnTo: null,
    authPrompt: null,
    pendingReportRouteIntent: null,
  };
}

export function createShellModel({
  copy,
  session,
}: {
  copy: ShellCopy;
  session: ShellModelSession;
}): ShellModel {
  return {
    appStates: createShellAppStates(copy.appStates),
    brand: copy.brand,
    locale: copy.locale,
    session,
    tabs: tabs.map((tab) => ({
      ...tab,
      label: copy.tabs[tab.key],
    })),
    reportActions: reportActions.map((action) => ({
      ...action,
      label: copy.reportActions[action.intent],
      memberOnly: true,
    })),
  };
}

function createShellAppStates(appStates: AppStateCatalog): AppStateCatalog {
  const locationPermissionEducation = appStates.permissionEducation.location;

  return {
    ...appStates,
    permissionEducation: {
      ...appStates.permissionEducation,
      location: {
        ...locationPermissionEducation,
        title: "Encuentra reportes cerca de ti",
        body: "Usamos tu ubicacion solo para ordenar reportes por distancia.",
        reasons: [
          "No solicitamos ubicacion al abrir la app.",
          "Puedes buscar por ciudad o zona en Bolivia.",
        ],
        actions: locationPermissionEducation.actions.map((action) => {
          if (action.id === "request-permission") {
            return {
              ...action,
              label: "Usar mi ubicacion actual",
            };
          }

          if (action.id === "manual-search") {
            return {
              ...action,
              label: "Buscar ciudad o zona",
            };
          }

          return action;
        }),
      },
    },
  };
}

export function createShellProfileModel({
  copy,
  session,
}: {
  copy: ShellCopy;
  session: ShellModelSession;
}): ShellProfileModel {
  const profileCopy = copy.screens.profile;

  if (session.kind === "loading") {
    return {
      accountSettings: null,
      body: copy.appStates.states.loading.body ?? "",
      isMember: false,
      title: copy.appStates.states.loading.title,
    };
  }

  if (session.kind === "visitor") {
    return {
      accountSettings: null,
      body: profileCopy.visitorBody,
      isMember: false,
      title: profileCopy.visitorTitle,
    };
  }

  return {
    accountSettings: {
      deletionAction: profileCopy.account.deletionAction,
      deletionBody: profileCopy.account.deletionBody,
      deletionImpacts: profileCopy.account.deletionImpacts,
      deletionPending: profileCopy.account.deletionPending,
      deletionSuccess: profileCopy.account.deletionSuccess,
      deletionTitle: profileCopy.account.deletionTitle,
      email: session.email,
      emailLabel: profileCopy.account.emailLabel,
      passwordResetAction: profileCopy.account.passwordResetAction,
      passwordResetBody: session.email
        ? profileCopy.account.passwordResetBody(session.email)
        : undefined,
      passwordResetPending: profileCopy.account.passwordResetPending,
      passwordResetSuccess: profileCopy.account.passwordResetSuccess,
      passwordResetTitle: profileCopy.account.passwordResetTitle,
      passwordResetUnavailable: profileCopy.account.passwordResetUnavailable,
      signOutAction: profileCopy.account.signOutAction,
      signOutPending: profileCopy.account.signOutPending,
      title: profileCopy.account.title,
    },
    body: profileCopy.memberBody,
    isMember: true,
    title: session.name ?? session.email ?? profileCopy.memberTitle,
  };
}

export function chooseReportAction(
  state: ShellState,
  action: ShellReportAction,
  copy: ShellCopy,
): ShellState {
  if (!action.memberOnly) {
    return {
      ...state,
      activeSheet: null,
      authReturnTo: null,
      authPrompt: null,
      pendingReportRouteIntent: null,
    };
  }

  const reportRouteRequestId = createShellReportRouteRequestId();

  return {
    ...state,
    activeSheet: null,
    authReturnTo: null,
    authPrompt: {
      intent: action.intent,
      reportRouteRequestId,
      selectedIntentLabel: action.label,
      title: copy.authPrompt.title,
      body: copy.authPrompt.bodyForIntent(action.label),
    },
    pendingReportRouteIntent: null,
  };
}

export function continueReportActionAsMember(
  state: ShellState,
  action: ShellReportAction,
): ShellState {
  return {
    ...state,
    activeSheet: null,
    authReturnTo: null,
    authPrompt: null,
    pendingReportRouteIntent: createShellReportRouteIntent(action),
  };
}

export function requestShellAuthPrompt(
  state: ShellState,
  copy: ShellCopy,
  request: ShellAuthPromptRequest = {},
): ShellState {
  return {
    ...state,
    activeSheet: null,
    authReturnTo: null,
    authPrompt: {
      body: copy.authPrompt.body,
      returnTo: request.returnTo,
      title: copy.authPrompt.title,
    },
    pendingReportRouteIntent: null,
  };
}

export function completeAuthPromptWithPendingReportRouteIntent(
  state: ShellState,
): ShellState {
  const prompt = state.authPrompt;
  const pendingReportRouteIntent =
    prompt?.intent && prompt.selectedIntentLabel
      ? createShellReportRouteIntent(
          {
            intent: prompt.intent,
            label: prompt.selectedIntentLabel,
          },
          prompt.reportRouteRequestId,
        )
      : state.pendingReportRouteIntent;

  return {
    ...state,
    authReturnTo: pendingReportRouteIntent ? null : (prompt?.returnTo ?? null),
    authPrompt: null,
    pendingReportRouteIntent,
  };
}

export function promotePendingReportRouteIntentForSession(
  state: ShellState,
  session: ShellModelSession,
): ShellState {
  if (session.kind !== "member") {
    return state;
  }

  return state.authPrompt
    ? completeAuthPromptWithPendingReportRouteIntent(state)
    : state;
}

export function clearPendingReportRouteIntent(
  state: ShellState,
  requestId?: number,
): ShellState {
  if (
    requestId !== undefined &&
    state.pendingReportRouteIntent?.requestId !== requestId
  ) {
    return state;
  }

  return {
    ...state,
    pendingReportRouteIntent: null,
  };
}

export function toShellMemberCreationSession(
  session: ShellModelSession,
): ShellMemberCreationSession | null {
  if (session.kind !== "member") {
    return null;
  }

  return {
    displayName: session.name ?? undefined,
    kind: "member",
    memberId: session.id,
  };
}

export function shouldShowGlobalFabForSegments(
  segments: readonly string[],
): boolean {
  const tabIndex = segments.findIndex((segment) =>
    mainTabRouteSegments.has(segment),
  );

  if (tabIndex === -1) {
    return false;
  }

  return segments.slice(tabIndex + 1).every((segment) => segment === "index");
}
