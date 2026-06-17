import type { ReportIntent, ShellCopy, ShellTabKey } from "../../i18n";
import type { AppStateCatalog } from "../app-states";

export interface ShellSession {
  kind: "visitor" | "member";
}

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
  session: ShellSession;
  tabs: ShellTab[];
  reportActions: ShellReportAction[];
}

export interface ShellAuthPrompt {
  intent: ReportIntent;
  selectedIntentLabel: string;
  title: string;
  body: string;
}

export interface ShellState {
  activeSheet: "report-actions" | null;
  authPrompt: ShellAuthPrompt | null;
  memberIntent: Pick<ShellReportAction, "intent" | "label"> | null;
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

export function createInitialShellState(): ShellState {
  return {
    activeSheet: null,
    authPrompt: null,
    memberIntent: null,
  };
}

export function createShellModel({
  copy,
  session,
}: {
  copy: ShellCopy;
  session: ShellSession;
}): ShellModel {
  return {
    appStates: copy.appStates,
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

export function chooseReportAction(
  state: ShellState,
  action: ShellReportAction,
  copy: ShellCopy,
): ShellState {
  if (!action.memberOnly) {
    return {
      ...state,
      activeSheet: null,
      authPrompt: null,
    };
  }

  return {
    ...state,
    activeSheet: null,
    authPrompt: {
      intent: action.intent,
      selectedIntentLabel: action.label,
      title: copy.authPrompt.title,
      body: copy.authPrompt.bodyForIntent(action.label),
    },
    memberIntent: null,
  };
}

export function continueReportActionAsMember(
  state: ShellState,
  action: ShellReportAction,
): ShellState {
  return {
    ...state,
    activeSheet: null,
    authPrompt: null,
    memberIntent: {
      intent: action.intent,
      label: action.label,
    },
  };
}
