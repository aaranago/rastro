import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShellSession } from "../shell/shell-model";
import AlertSubscriptionSettingsRoute from "../../app/(tabs)/(profile)/alertas";

(globalThis as { React?: typeof React }).React = React;

const shell = vi.hoisted(() => ({
  requestAuthPrompt: vi.fn(),
  session: { kind: "visitor" } as ShellSession,
}));

const api = vi.hoisted(() => ({
  trpcClient: {},
}));

const alerts = vi.hoisted(() => ({
  capturedProps: null as Record<string, unknown> | null,
  createApiAlertSubscriptionRepository: vi.fn(),
  repository: {
    disableAlertSubscription: vi.fn(),
    enableAlertSubscription: vi.fn(),
    getAlertSubscription: vi.fn(),
    matchNewLostPetReportAlerts: vi.fn(),
    pauseAlertSubscription: vi.fn(),
    recordAlertAreaLocation: vi.fn(),
    registerPushToken: vi.fn(),
    unsubscribeAlertSubscription: vi.fn(),
    updateMovingAlertsPreference: vi.fn(),
  },
}));

vi.mock("~/features/shell/shell-provider", () => ({
  useRastroShell: () => shell,
}));

vi.mock("~/utils/api", () => ({
  trpcClient: api.trpcClient,
}));

vi.mock("~/features/alert-subscriptions", () => {
  alerts.createApiAlertSubscriptionRepository.mockReturnValue(
    alerts.repository,
  );

  return {
    AlertSubscriptionSettingsScreen: (props: Record<string, unknown>) => {
      alerts.capturedProps = props;

      return React.createElement("AlertSubscriptionSettingsScreen", props);
    },
    createApiAlertSubscriptionRepository:
      alerts.createApiAlertSubscriptionRepository,
  };
});

describe("AlertSubscriptionSettingsRoute", () => {
  beforeEach(() => {
    alerts.capturedProps = null;
    shell.requestAuthPrompt.mockReset();
    shell.session = { kind: "visitor" } as ShellSession;
  });

  it("preserves the Alertas return path when visitors sign in", () => {
    void renderFunctionElement(<AlertSubscriptionSettingsRoute />);

    const onRequestSignIn = alerts.capturedProps
      ?.onRequestSignIn as (() => void) | undefined;
    onRequestSignIn?.();

    expect(shell.requestAuthPrompt).toHaveBeenCalledWith({
      returnTo: "/(tabs)/(profile)/alertas",
      sourceHref:
        "rastro://auth/sign-in?returnTo=%2F(tabs)%2F(profile)%2Falertas",
    });
  });
});

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

function renderFunctionElement(node: React.ReactNode): React.ReactNode {
  if (!React.isValidElement<ElementProps>(node)) {
    return node;
  }

  if (typeof node.type !== "function") {
    return node;
  }

  const Component = node.type as (props: ElementProps) => React.ReactNode;

  return renderFunctionElement(Component(node.props));
}
