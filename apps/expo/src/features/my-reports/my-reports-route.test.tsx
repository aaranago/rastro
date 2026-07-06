import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShellSession } from "../shell/shell-model";
import MisReportesRoute from "../../app/(tabs)/(profile)/mis-reportes";

(globalThis as { React?: typeof React }).React = React;

const api = vi.hoisted(() => ({
  trpcClient: {},
}));

const shell = vi.hoisted(() => ({
  requestAuthPrompt: vi.fn(),
  session: {
    email: "camila@example.com",
    id: "member-camila",
    kind: "member",
    name: "Camila",
  } as ShellSession,
}));

const myReports = vi.hoisted(() => ({
  capturedProps: null as Record<string, unknown> | null,
  createApiMyReportsRepository: vi.fn(),
  repository: {
    deleteReport: vi.fn(),
    listReports: vi.fn(),
    resolveReport: vi.fn(),
  },
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useMemo: <TValue,>(factory: () => TValue) => factory(),
  };
});

vi.mock("~/utils/api", () => ({
  trpcClient: api.trpcClient,
}));

vi.mock("~/features/shell/shell-provider", () => ({
  useRastroShell: () => shell,
}));

vi.mock("~/features/my-reports", () => {
  myReports.createApiMyReportsRepository.mockReturnValue(myReports.repository);

  return {
    createApiMyReportsRepository: myReports.createApiMyReportsRepository,
    MyReportsScreen: (props: Record<string, unknown>) => {
      myReports.capturedProps = props;

      return React.createElement("MyReportsScreen", props);
    },
  };
});

describe("MisReportesRoute", () => {
  beforeEach(() => {
    myReports.capturedProps = null;
    shell.requestAuthPrompt.mockReset();
    shell.session = {
      email: "camila@example.com",
      id: "member-camila",
      kind: "member",
      name: "Camila",
    } as ShellSession;
  });

  it("renders the real owned-report management screen for members", () => {
    void renderFunctionElement(<MisReportesRoute />);

    expect(myReports.createApiMyReportsRepository).toHaveBeenCalledWith({
      client: api.trpcClient,
    });
    expect(myReports.capturedProps).toMatchObject({
      repository: myReports.repository,
      session: {
        kind: "member",
        memberId: "member-camila",
      },
    });
  });

  it("preserves the Mis reportes return path when visitors sign in", () => {
    shell.session = { kind: "visitor" } as ShellSession;

    void renderFunctionElement(<MisReportesRoute />);

    const onRequestSignIn = myReports.capturedProps
      ?.onRequestSignIn as (() => void) | undefined;
    onRequestSignIn?.();

    expect(shell.requestAuthPrompt).toHaveBeenCalledWith({
      returnTo: "/(tabs)/(profile)/mis-reportes",
      sourceHref:
        "rastro://auth/sign-in?returnTo=%2F(tabs)%2F(profile)%2Fmis-reportes",
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
