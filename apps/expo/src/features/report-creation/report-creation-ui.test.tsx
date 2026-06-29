import type { ScrollView } from "react-native";
import * as React from "react";
import { Text } from "react-native";
import { describe, expect, it, vi } from "vitest";

import type { ReportCreationStyles } from "./report-creation-ui";
import { createLostReportDraft } from "../lost-report-creation/lost-report-creation-view-model";
import { createReportCreationJourney } from "./report-creation-journey";
import {
  getReportCreationScreenInsets,
  ReportCreationContactOptionSection,
  ReportCreationDetailsFieldsSection,
  ReportCreationDraftPersistenceAlert,
  ReportCreationDraftRecoveryPrompt,
  ReportCreationExistingPetProfileList,
  ReportCreationInlinePetTypeRow,
  ReportCreationLocationPreview,
  ReportCreationProgressSteps,
  ReportCreationPublishConfirmationModal,
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

vi.mock("@react-native-community/datetimepicker", () => ({
  default: "DateTimePicker",
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
      contentInsetBottom: 188,
      contentPaddingTop: 28,
      footerPaddingBottom: 16,
      scrollIndicatorInsetBottom: 0,
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
    expect(scrollView?.props.contentInset).toEqual({ bottom: 206 });
    expect(scrollView?.props.scrollIndicatorInsets).toEqual({ bottom: 0 });
    expect(scrollView?.props.ref).toBe(scrollRef);
    expect(scrollView?.props.contentContainerStyle).toEqual([
      { gap: 14, padding: 16, paddingBottom: 36 },
      {
        paddingBottom: 206,
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

describe("ReportCreationPublishConfirmationModal", () => {
  it("shows a final backend publish confirmation with summary rows and explicit actions", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const screen = renderFunctionElement(
      <ReportCreationPublishConfirmationModal
        activityIndicatorColor="#FFFFFF"
        body="Rastro publicara este reporte despues de confirmar."
        canConfirm
        Icon={TestIcon}
        onCancel={onCancel}
        onConfirm={onConfirm}
        publishState="editing"
        rows={[
          { label: "Tipo", value: "Reporte de avistamiento" },
          { label: "Ubicacion", value: "Sopocachi, La Paz" },
          { label: "Contacto", value: "Chat en Rastro" },
        ]}
        title="Confirmar publicacion"
      />,
    );
    const cancelButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" && findText(element, "Volver a editar"),
    );
    const confirmButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        findText(element, "Confirmar y publicar"),
    );

    expect(
      findElement(
        screen,
        (element) => element.props.testID === "report-publish-confirmation",
      ),
    ).toBeDefined();
    expect(findText(screen, "Tipo")).toBe(true);
    expect(findText(screen, "Reporte de avistamiento")).toBe(true);
    expect(findText(screen, "Sopocachi, La Paz")).toBe(true);

    void getPressableOnPress(cancelButton)();
    void getPressableOnPress(confirmButton)();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("locks the confirmation buttons while publishing", () => {
    const screen = renderFunctionElement(
      <ReportCreationPublishConfirmationModal
        activityIndicatorColor="#FFFFFF"
        body="Rastro publicara este reporte despues de confirmar."
        canConfirm
        Icon={TestIcon}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        publishState="publishing"
        rows={[{ label: "Tipo", value: "Reporte de mascota perdida" }]}
        title="Confirmar publicacion"
      />,
    );
    const confirmButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Publicando reporte",
    );

    expect(confirmButton?.props.disabled).toBe(true);
    expect(confirmButton?.props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
    expect(
      findElement(screen, (element) => element.type === "ActivityIndicator"),
    ).toBeDefined();
  });
});

describe("ReportCreationLocationPreview", () => {
  it("renders a native Bolivia preview without placeholder location copy", () => {
    const preview = renderFunctionElement(
      <ReportCreationLocationPreview
        accentColor="#147A68"
        coordinates={{ latitude: -16.4897, longitude: -68.1193 }}
        Icon={TestIcon}
        label="La Paz, Bolivia"
      />,
    );
    const previewImage = findElement(
      preview,
      (element) =>
        element.props.accessibilityRole === "image" &&
        element.props.accessibilityLabel === "Mapa de Bolivia, La Paz, Bolivia",
    );

    expect(previewImage).toBeDefined();
    expect(findText(preview, "La Paz, Bolivia")).toBe(true);
    expect(findText(preview, "Mapa de Bolivia pendiente")).toBe(false);
    expect(findText(preview, "Pin interno")).toBe(false);
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

describe("shared report creation form controls", () => {
  it("exposes field labels and errors to assistive technology", () => {
    const screen = renderFunctionElement(
      <ReportCreationDetailsFieldsSection
        fields={[
          {
            field: {
              error: "Agrega una descripcion.",
              label: "Descripcion",
              placeholder: "Color, collar o senas visibles",
              value: "",
            },
            key: "description",
          },
        ]}
        onChangeField={() => undefined}
        placeholderTextColor="#66736D"
        styles={fieldStyles as ReportCreationStyles}
        title="Detalles"
      />,
    );
    const input = findElement(
      screen,
      (element) => element.type === "TextInput",
    );

    expect(input?.props.accessibilityLabel).toBe("Descripcion");
    expect(input?.props.accessibilityHint).toBe("Agrega una descripcion.");
  });

  it("marks selected pet, type, and contact options for screen readers", () => {
    const onSelectProfile = vi.fn();
    const petList = renderFunctionElement(
      <ReportCreationExistingPetProfileList
        accentColor="#0F7665"
        Icon={TestIcon}
        onSelectProfile={onSelectProfile}
        options={[
          {
            body: "Perro",
            id: "pet-1",
            isSelected: true,
            photoCountLabel: "1 foto",
            title: "Luna",
          },
        ]}
        styles={petListStyles}
      />,
    );
    const typeRow = renderFunctionElement(
      <ReportCreationInlinePetTypeRow
        onSelectType={() => undefined}
        selectedType="Perro"
        styles={typeRowStyles}
        typeOptions={["Perro", "Gato"]}
      />,
    );
    const contactOptions = renderFunctionElement(
      <ReportCreationContactOptionSection
        accentColor="#0F7665"
        Icon={TestIcon}
        onChangeWhatsappPhone={() => undefined}
        onSelectOption={() => undefined}
        options={[
          {
            body: "Chat dentro de Rastro",
            iconName: "message.fill",
            isSelected: true,
            label: "Chat",
            value: "chat",
          },
        ]}
        styles={contactStyles as ReportCreationStyles}
        title="Contacto"
        whatsappField={{
          label: "WhatsApp",
          placeholder: "+591",
          value: "",
          visible: false,
        }}
      />,
    );

    expect(
      findElement(
        petList,
        (element) => element.type === "Pressable" && findText(element, "Luna"),
      )?.props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      findElement(
        typeRow,
        (element) => element.type === "Pressable" && findText(element, "Perro"),
      )?.props.accessibilityState,
    ).toEqual({ selected: true });
    expect(
      findElement(
        contactOptions,
        (element) => element.type === "Pressable" && findText(element, "Chat"),
      )?.props.accessibilityState,
    ).toEqual({ selected: true });
  });
});

describe("ReportCreationProgressSteps", () => {
  it("renders a compact Spanish progress summary with only the current step label visible", () => {
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

    expect(findText(screen, "Paso 5 de 5")).toBe(true);
    expect(findText(screen, "Revisar")).toBe(true);
    expect(findText(screen, "Tipo")).toBe(false);
    expect(findText(screen, "Publicado")).toBe(false);
  });

  it("labels every compact canonical step accessibly without visible status words", () => {
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
    const stepMarkers = findElements(
      screen,
      (element) =>
        typeof element.props.accessibilityLabel === "string" &&
        /^Paso \d+ de 5, /.test(element.props.accessibilityLabel),
    );
    const completedStep = findElement(
      screen,
      (element) =>
        element.props.accessibilityLabel === "Paso 1 de 5, Fotos, completado",
    );
    const currentStep = findElement(
      screen,
      (element) =>
        element.props.accessibilityLabel ===
        "Paso 5 de 5, Revisar, paso actual",
    );
    const overallProgress = findElement(
      screen,
      (element) =>
        element.props.accessibilityLabel ===
        "Progreso de creacion, Paso 5 de 5, Revisar",
    );

    expect(stepMarkers).toHaveLength(5);
    expect(findText(screen, "Completado")).toBe(false);
    expect(findText(screen, "Actual")).toBe(false);
    expect(findText(screen, "Pendiente")).toBe(false);
    expect(findText(screen, "✓")).toBe(true);
    expect(overallProgress?.props.accessibilityRole).toBe("progressbar");
    expect(overallProgress?.props.accessibilityValue).toEqual({
      max: 5,
      min: 1,
      now: 5,
      text: "Paso 5 de 5, Revisar",
    });
    expect(completedStep?.props.accessibilityRole).toBe("text");
    expect(completedStep?.props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(currentStep?.props.accessibilityRole).toBe("text");
    expect(currentStep?.props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it("keeps legacy isComplete callers working while exposing every step accessibly", () => {
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
        "Paso 3 de 4, Contacto, paso actual",
    );

    expect(findText(screen, "Paso 3 de 4")).toBe(true);
    expect(findText(screen, "Contacto")).toBe(true);
    expect(findText(screen, "Publicado")).toBe(false);
    expect(currentStep?.props.accessibilityState).toMatchObject({
      selected: true,
    });
  });
});

function TestIcon() {
  return null;
}

const fieldStyles = {
  errorText: {},
  field: {},
  fieldLabel: {},
  input: {},
  multilineInput: {},
  section: {},
  sectionTitle: {},
};

const petListStyles = {
  itemTitle: {},
  metaText: {},
  optionCopy: {},
  optionStack: {},
  petOption: {},
  petThumb: {},
  selectedBorder: {},
};

const typeRowStyles = {
  selectedPill: {},
  selectedPillText: {},
  typePill: {},
  typePillText: {},
  typeRow: {},
};

const contactStyles = {
  contactOption: {},
  errorText: {},
  field: {},
  fieldLabel: {},
  input: {},
  itemTitle: {},
  metaText: {},
  multilineInput: {},
  optionCopy: {},
  optionStack: {},
  section: {},
  sectionTitle: {},
  selectedBorder: {},
};

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

function findElements(
  node: React.ReactNode,
  predicate: (element: TestElement) => boolean,
): TestElement[] {
  const rendered = renderFunctionElement(node);

  if (!React.isValidElement<ElementProps>(rendered)) {
    return [];
  }

  return [
    ...(predicate(rendered) ? [rendered] : []),
    ...React.Children.toArray(rendered.props.children).flatMap((child) =>
      findElements(child, predicate),
    ),
  ];
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
