import type { ScrollView } from "react-native";
import * as React from "react";
import { Text } from "react-native";
import { describe, expect, it, vi } from "vitest";

import { createLostReportDraft } from "../lost-report-creation/lost-report-creation-view-model";
import { createReportCreationJourney } from "./report-creation-journey";
import {
  getReportCreationScreenInsets,
  ReportCreationDraftPersistenceAlert,
  ReportCreationDraftRecoveryPrompt,
  ReportCreationProgressSteps,
  ReportCreationReviewPublishSection,
  ReportCreationScreenFrame,
} from "./report-creation-ui";

vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Platform: {
    OS: "ios",
  },
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

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    bottom: 34,
    left: 0,
    right: 0,
    top: 47,
  }),
}));

describe("getReportCreationScreenInsets", () => {
  it("derives top and bottom spacing from safe-area insets without a fixed bottom constant", () => {
    expect(
      getReportCreationScreenInsets({
        bottom: 34,
        hasFooter: false,
        top: 47,
      }),
    ).toEqual({
      contentInsetBottom: 34,
      contentPaddingTop: 63,
      footerPaddingBottom: 34,
      scrollIndicatorInsetBottom: 34,
    });
  });

  it("reserves footer reachability space above the home indicator when actions are sticky", () => {
    expect(
      getReportCreationScreenInsets({
        bottom: 0,
        hasFooter: true,
        top: 0,
      }),
    ).toEqual({
      contentInsetBottom: 104,
      contentPaddingTop: 28,
      footerPaddingBottom: 16,
      scrollIndicatorInsetBottom: 104,
    });
  });
});

describe("ReportCreationScreenFrame", () => {
  it("wraps scroll content in a keyboard-aware safe-area frame and keeps the footer outside the scroll body", () => {
    const scrollRef = React.createRef<React.ComponentRef<typeof ScrollView>>();
    const screen = renderFunctionElement(
      <ReportCreationScreenFrame
        contentContainerStyle={{ gap: 14, padding: 16, paddingBottom: 36 }}
        footer={<Text>Continuar</Text>}
        scrollViewRef={scrollRef}
        style={{ flex: 1 }}
      >
        <Text>Detalles</Text>
      </ReportCreationScreenFrame>,
    );
    const keyboardFrame = findElement(
      screen,
      (element) => element.type === "KeyboardAvoidingView",
    );
    const scrollView = findElement(
      screen,
      (element) => element.type === "ScrollView",
    );
    const footer = findElement(
      screen,
      (element) => element.props.testID === "report-creation-frame-footer",
    );

    expect(keyboardFrame?.props.behavior).toBe("padding");
    expect(scrollView?.props.keyboardShouldPersistTaps).toBe("handled");
    expect(scrollView?.props.contentInset).toEqual({ bottom: 122 });
    expect(scrollView?.props.scrollIndicatorInsets).toEqual({ bottom: 122 });
    expect(scrollView?.props.ref).toBe(scrollRef);
    expect(scrollView?.props.contentContainerStyle).toEqual([
      { gap: 14, padding: 16, paddingBottom: 36 },
      {
        paddingBottom: 122,
        paddingTop: 63,
      },
    ]);
    expect(findText(scrollView, "Continuar")).toBe(false);
    expect(findText(footer, "Continuar")).toBe(true);
    expect(footer?.props.style).toEqual([
      expect.anything(),
      { paddingBottom: 34 },
    ]);
  });
});

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

describe("ReportCreationDraftRecoveryPrompt", () => {
  it("offers explicit resume and discard actions for a saved durable draft", () => {
    const onDiscardDraft = vi.fn();
    const onResumeDraft = vi.fn();
    const screen = renderFunctionElement(
      <ReportCreationDraftRecoveryPrompt
        draftRecovery={{
          draft: {
            draft: createLostReportDraft(),
            kind: "lost-report",
            savedAt: "2026-06-22T10:30:00.000Z",
            schemaVersion: 2,
          },
          status: "available",
        }}
        onDiscardDraft={onDiscardDraft}
        onResumeDraft={onResumeDraft}
      />,
    );
    const alert = findElement(
      screen,
      (element) => element.props.accessibilityRole === "alert",
    );
    const resumeButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Retomar borrador"),
    );
    const discardButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Descartar borrador"),
    );

    expect(alert?.props.accessibilityLiveRegion).toBe("polite");
    expect(findText(alert, "Encontramos un borrador guardado.")).toBe(true);

    void getPressableOnPress(resumeButton)();
    void getPressableOnPress(discardButton)();

    expect(onResumeDraft).toHaveBeenCalledTimes(1);
    expect(onDiscardDraft).toHaveBeenCalledTimes(1);
  });

  it("explains incompatible saved drafts and offers discard", () => {
    const onDiscardDraft = vi.fn();
    const screen = renderFunctionElement(
      <ReportCreationDraftRecoveryPrompt
        draftRecovery={{
          reason: "Stored draft is not compatible with this app version.",
          status: "incompatible",
        }}
        onDiscardDraft={onDiscardDraft}
        onResumeDraft={vi.fn()}
      />,
    );
    const discardButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Descartar borrador"),
    );

    expect(findText(screen, "No pudimos abrir el borrador guardado.")).toBe(
      true,
    );
    expect(
      findText(screen, "Stored draft is not compatible with this app version."),
    ).toBe(true);

    void getPressableOnPress(discardButton)();

    expect(onDiscardDraft).toHaveBeenCalledTimes(1);
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
    expect(submitButton?.props.accessibilityLabel).toBe(
      "Publicando avistamiento",
    );
    expect(submitButton?.props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
    expect(
      findElement(
        screen,
        (element) =>
          element.props.accessibilityRole === "alert" &&
          element.props.accessibilityLiveRegion === "polite" &&
          findText(element, submitError),
      ),
    ).toBeDefined();
  });

  it("exposes disabled publish actions and validation summaries accessibly", () => {
    const screen = renderFunctionElement(
      <ReportCreationReviewPublishSection
        activityIndicatorColor="#FFFFFF"
        canPublish={false}
        Icon={TestIcon}
        onPublish={() => undefined}
        publishActionLabel="Publicar reporte"
        publishState="editing"
        rows={[{ label: "Mascota", value: "Perro" }]}
        styles={
          reviewStyles as React.ComponentProps<
            typeof ReportCreationReviewPublishSection
          >["styles"]
        }
        submitError={null}
        validationErrors={["Agrega una foto.", "Elige una ubicacion."]}
      />,
    );
    const submitButton = findElement(
      screen,
      (element) => element.props.accessibilityRole === "button",
    );
    const validationSummary = findElement(
      screen,
      (element) =>
        element.props.accessibilityRole === "alert" &&
        element.props.accessibilityLiveRegion === "polite",
    );

    expect(submitButton?.props.accessibilityLabel).toBe("Publicar reporte");
    expect(submitButton?.props.accessibilityState).toMatchObject({
      busy: false,
      disabled: true,
    });
    expect(findText(validationSummary, "Agrega una foto.")).toBe(true);
    expect(findText(validationSummary, "Elige una ubicacion.")).toBe(true);
  });
});

describe("ReportCreationProgressSteps", () => {
  it("renders every canonical journey step with Spanish progress text", () => {
    const journey = createReportCreationJourney({
      completedStepIds: [
        "chooseType",
        "photos",
        "details",
        "location",
        "contact",
      ],
      currentStepId: "review",
      reportType: "lost",
    });

    const screen = renderFunctionElement(
      <ReportCreationProgressSteps
        steps={journey.steps}
        styles={progressStyles}
      />,
    );

    expect(findText(screen, "Paso 6 de 8")).toBe(true);
    expect(findText(screen, "Tipo")).toBe(true);
    expect(findText(screen, "Publicado")).toBe(true);
  });

  it("labels completed, current, and upcoming canonical steps accessibly and textually", () => {
    const journey = createReportCreationJourney({
      completedStepIds: [
        "chooseType",
        "photos",
        "details",
        "location",
        "contact",
      ],
      currentStepId: "review",
      reportType: "lost",
    });

    const screen = renderFunctionElement(
      <ReportCreationProgressSteps
        steps={journey.steps}
        styles={progressStyles}
      />,
    );
    const completedStep = findElement(
      screen,
      (element) =>
        element.props.accessibilityLabel === "Paso 1 de 8, Tipo, completado",
    );
    const currentStep = findElement(
      screen,
      (element) =>
        element.props.accessibilityLabel ===
        "Paso 6 de 8, Revisar, paso actual",
    );
    const upcomingStep = findElement(
      screen,
      (element) =>
        element.props.accessibilityLabel ===
        "Paso 8 de 8, Publicado, pendiente",
    );
    const overallProgress = findElement(
      screen,
      (element) =>
        element.props.accessibilityLabel ===
        "Progreso de creacion, Paso 6 de 8",
    );

    expect(findText(screen, "Completado")).toBe(true);
    expect(findText(screen, "Actual")).toBe(true);
    expect(findText(screen, "Pendiente")).toBe(true);
    expect(overallProgress?.props.accessibilityRole).toBe("progressbar");
    expect(overallProgress?.props.accessibilityValue).toEqual({
      max: 8,
      min: 1,
      now: 6,
      text: "Paso 6 de 8",
    });
    expect(completedStep?.props.accessibilityRole).toBe("text");
    expect(completedStep?.props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(currentStep?.props.accessibilityRole).toBe("text");
    expect(currentStep?.props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(upcomingStep?.props.accessibilityRole).toBe("text");
    expect(upcomingStep?.props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it("keeps legacy isComplete callers working while rendering every step", () => {
    const screen = renderFunctionElement(
      <ReportCreationProgressSteps
        steps={[
          { id: "details", isComplete: true, label: "Detalles" },
          { id: "location", isComplete: true, label: "Ubicacion" },
          { id: "contact", isComplete: false, label: "Contacto" },
          { id: "review", isComplete: false, label: "Revisar" },
          { id: "success", isComplete: false, label: "Publicado" },
        ]}
        styles={progressStyles}
      />,
    );
    const currentStep = findElement(
      screen,
      (element) =>
        element.props.accessibilityLabel ===
        "Paso 3 de 5, Contacto, paso actual",
    );

    expect(findText(screen, "Paso 3 de 5")).toBe(true);
    expect(findText(screen, "Publicado")).toBe(true);
    expect(currentStep?.props.accessibilityState).toMatchObject({
      selected: true,
    });
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

const progressStyles = {
  stepDot: {},
  stepDotComplete: {},
  stepItem: {},
  stepLabel: {},
  stepNumber: {},
  stepNumberComplete: {},
  steps: {},
} as React.ComponentProps<typeof ReportCreationProgressSteps>["styles"];

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

function getPressableOnPress(
  element: TestElement | undefined,
): () => void | Promise<void> {
  const onPress = element?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error("Expected pressable onPress handler.");
  }

  return onPress as () => void | Promise<void>;
}
