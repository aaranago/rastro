import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  ReportCreationDraftPersistenceAlert,
  ReportCreationReviewPublishSection,
} from "./report-creation-ui";

vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
}));

vi.mock("expo-image", () => ({
  Image: "Image",
}));

describe("ReportCreationDraftPersistenceAlert", () => {
  it("renders autosave failures as a visible accessible Spanish alert", () => {
    const message =
      "No pudimos guardar el borrador en este dispositivo. Tus cambios siguen en pantalla.";
    const screen = renderFunctionElement(
      <ReportCreationDraftPersistenceAlert
        draftPersistence={{
          error: {
            cause: new Error("SecureStore unavailable"),
            kind: "save",
            message,
          },
          status: "error",
        }}
      />,
    );
    const alert = findElement(
      screen,
      (element) => element.props.accessibilityRole === "alert",
    );

    expect(alert?.props.accessibilityLiveRegion).toBe("polite");
    expect(findText(alert, message)).toBe(true);
  });

  it("renders nothing when draft persistence is healthy", () => {
    expect(
      renderFunctionElement(
        <ReportCreationDraftPersistenceAlert
          draftPersistence={{
            error: null,
            status: "saved",
          }}
        />,
      ),
    ).toBeNull();
  });
});

describe("ReportCreationReviewPublishSection", () => {
  it("renders publish errors visibly and disables submit while publishing", () => {
    const submitError =
      "No pudimos publicar porque el servicio no esta disponible. Tu borrador sigue aqui para intentar de nuevo.";
    const screen = renderFunctionElement(
      <ReportCreationReviewPublishSection
        activityIndicatorColor="#FFFFFF"
        canPublish
        Icon={TestIcon}
        onPublish={() => undefined}
        publishActionLabel="Publicar avistamiento"
        publishState="publishing"
        rows={[{ label: "Mascota", value: "Perro" }]}
        styles={
          reviewStyles as React.ComponentProps<
            typeof ReportCreationReviewPublishSection
          >["styles"]
        }
        submitError={submitError}
        validationErrors={[]}
      />,
    );
    const submitButton = findElement(
      screen,
      (element) => element.props.accessibilityRole === "button",
    );

    expect(findText(screen, submitError)).toBe(true);
    expect(submitButton?.props.disabled).toBe(true);
  });
});

function TestIcon() {
  return null;
}

const reviewStyles = {
  disabledButton: {},
  errorText: {},
  pressed: {},
  publishButton: {},
  reviewLabel: {},
  reviewList: {},
  reviewRow: {},
  reviewValue: {},
  section: {},
  sectionTitle: {},
};

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

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

function findElement(
  node: React.ReactNode,
  predicate: (element: TestElement) => boolean,
): TestElement | undefined {
  const rendered = renderFunctionElement(node);

  if (!React.isValidElement<ElementProps>(rendered)) {
    return undefined;
  }

  if (predicate(rendered)) {
    return rendered;
  }

  for (const child of React.Children.toArray(rendered.props.children)) {
    const found = findElement(child, predicate);

    if (found) {
      return found;
    }
  }

  return undefined;
}

function findText(node: React.ReactNode, text: string): boolean {
  const rendered = renderFunctionElement(node);

  if (typeof rendered === "string") {
    return rendered === text;
  }

  if (!React.isValidElement<ElementProps>(rendered)) {
    return false;
  }

  return React.Children.toArray(rendered.props.children).some((child) =>
    findText(child, text),
  );
}
