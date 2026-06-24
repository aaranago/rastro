import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReportLocationPickerScreen } from "./report-location-picker-screen";

(globalThis as { React?: typeof React }).React = React;

const reactState = vi.hoisted(() => ({
  cursor: 0,
  values: [] as unknown[],
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");

  return {
    ...actual,
    useCallback: <TCallback,>(callback: TCallback) => callback,
    useMemo: <TValue,>(factory: () => TValue) => factory(),
    useState: <TValue,>(initialValue: TValue) => {
      const index = reactState.cursor;
      reactState.cursor += 1;

      if (reactState.values.length <= index) {
        reactState.values[index] =
          typeof initialValue === "function"
            ? (initialValue as () => TValue)()
            : initialValue;
      }

      return [
        reactState.values[index],
        (nextValue: React.SetStateAction<TValue>) => {
          reactState.values[index] =
            typeof nextValue === "function"
              ? (nextValue as (current: TValue) => TValue)(
                  reactState.values[index] as TValue,
                )
              : nextValue;
        },
      ];
    },
  };
});

vi.mock("react-native", () => ({
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
  View: "View",
}));

vi.mock("@react-native-community/datetimepicker", () => ({
  default: "DateTimePicker",
}));

vi.mock("react-native-maps", () => ({
  default: "MapView",
  Marker: "Marker",
  PROVIDER_GOOGLE: "google",
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

vi.mock("../maps/map-provider-config", () => ({
  getNativeMapProviderState: () => ({ kind: "ready" }),
}));

describe("ReportLocationPickerScreen", () => {
  beforeEach(() => {
    reactState.cursor = 0;
    reactState.values = [];
  });

  it("shows permission education and manual choices before requesting location", () => {
    const adapter = createNearbyLocationAdapterBoundary();
    const screen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        onConfirm={() => undefined}
      />,
    );

    expect(
      findText(
        screen,
        "Elige una zona aproximada o marca un punto exacto. Por defecto mostramos solo la zona al publico.",
      ),
    ).toBe(true);
    expect(findText(screen, "Usar mi ubicacion actual")).toBe(true);
    expect(findText(screen, "Departamento seleccionado")).toBe(true);
    expect(findText(screen, "La Paz")).toBe(true);
    expect(
      findElement(
        screen,
        (element) =>
          element.type === "Pressable" &&
          element.props.accessibilityLabel ===
            "Usar La Paz como zona aproximada",
      ),
    ).toBeTruthy();
    expect(findText(screen, "Marcar punto exacto en el mapa")).toBe(true);
    expect(adapter.resolveForegroundLocation).not.toHaveBeenCalled();
  });

  it("lets people change department before choosing a manual city", () => {
    const adapter = createNearbyLocationAdapterBoundary();
    const onConfirm = vi.fn();
    const screen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );
    const departmentButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel ===
          "Cambiar departamento. Seleccion actual: La Paz",
    );

    void getPressableOnPress(departmentButton)();

    const expandedScreen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );
    const santaCruzButton = findElement(
      expandedScreen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Mostrar ciudades de Santa Cruz",
    );

    void getPressableOnPress(santaCruzButton)();

    const santaCruzScreen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );
    const departmentChoiceButton = findElement(
      santaCruzScreen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel ===
          "Usar Santa Cruz como zona aproximada",
    );

    void getPressableOnPress(departmentChoiceButton)();

    expect(onConfirm).toHaveBeenCalledWith({
      addressLabel: "Santa Cruz de la Sierra",
      coordinates: { latitude: -17.7833, longitude: -63.1821 },
      department: "Santa Cruz",
      locationCellLabel: "Santa Cruz de la Sierra",
      municipality: "Santa Cruz de la Sierra",
    });
  });

  it("requests current location from the primary action and confirms an available result", async () => {
    const adapter = createNearbyLocationAdapterBoundary();
    const onConfirm = vi.fn();
    adapter.resolveForegroundLocation.mockResolvedValueOnce({
      kind: "available",
      location: {
        coordinates: { latitude: -16.5002, longitude: -68.1195 },
        countryCode: "BO",
        department: "La Paz",
        label: "La Paz",
        locationCellLabel: "La Paz",
        municipality: "La Paz",
        source: "current",
      },
      permission: {
        granted: true,
        status: "granted",
      },
    });
    const screen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );
    const currentLocationButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Usar mi ubicacion actual",
    );

    await getPressableOnPress(currentLocationButton)();

    expect(adapter.resolveForegroundLocation).toHaveBeenCalledWith({
      requestPermission: true,
    });
    expect(onConfirm).toHaveBeenCalledWith({
      addressLabel: "La Paz",
      coordinates: { latitude: -16.5002, longitude: -68.1195 },
      department: "La Paz",
      locationCellLabel: "La Paz",
      municipality: "La Paz",
    });
  });

  it("shows denied-location fallback copy while keeping manual options visible", async () => {
    const adapter = createNearbyLocationAdapterBoundary();
    adapter.resolveForegroundLocation.mockResolvedValueOnce({
      kind: "permission-denied",
      permission: {
        canAskAgain: false,
        granted: false,
        status: "denied",
      },
    });
    const screen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        onConfirm={() => undefined}
      />,
    );
    const currentLocationButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Usar mi ubicacion actual",
    );

    await getPressableOnPress(currentLocationButton)();

    const deniedScreen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        onConfirm={() => undefined}
      />,
    );

    expect(findText(deniedScreen, "Permiso de ubicacion denegado")).toBe(true);
    expect(
      findText(
        deniedScreen,
        "No tenemos permiso para usar tu ubicacion. Puedes elegir una ciudad, un departamento o un punto manual.",
      ),
    ).toBe(true);
    expect(findText(deniedScreen, "La Paz")).toBe(true);
    expect(findText(deniedScreen, "Marcar punto exacto en el mapa")).toBe(true);
  });

  it("confirms a manually selected map pin as a report location draft", () => {
    const onConfirm = vi.fn();
    const adapter = createNearbyLocationAdapterBoundary();
    const screen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        initialMapCoordinate={{ latitude: -16.5022, longitude: -68.1213 }}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );
    const mapOption = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Marcar punto exacto en La Paz",
    );

    void getPressableOnPress(mapOption)();

    const mapScreen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        initialMapCoordinate={{ latitude: -16.5022, longitude: -68.1213 }}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );
    const confirmPinButton = findElement(
      mapScreen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Confirmar punto elegido",
    );

    void getPressableOnPress(confirmPinButton)();

    expect(onConfirm).toHaveBeenCalledWith({
      addressLabel: "Pin manual -16.5022, -68.1213",
      coordinates: { latitude: -16.5022, longitude: -68.1213 },
      department: "Bolivia",
      locationCellLabel: "Punto elegido",
      municipality: "Punto manual",
    });
  });

  it("seeds an untouched map pin from the selected department", () => {
    const onConfirm = vi.fn();
    const adapter = createNearbyLocationAdapterBoundary();
    const screen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );
    const departmentButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel ===
          "Cambiar departamento. Seleccion actual: La Paz",
    );

    void getPressableOnPress(departmentButton)();

    const expandedScreen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );
    const santaCruzButton = findElement(
      expandedScreen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Mostrar ciudades de Santa Cruz",
    );

    void getPressableOnPress(santaCruzButton)();

    const santaCruzScreen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );
    const mapOption = findElement(
      santaCruzScreen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel ===
          "Marcar punto exacto en Santa Cruz",
    );

    void getPressableOnPress(mapOption)();

    const mapScreen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );
    const confirmPinButton = findElement(
      mapScreen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Confirmar punto elegido",
    );

    void getPressableOnPress(confirmPinButton)();

    expect(onConfirm).toHaveBeenCalledWith({
      addressLabel: "Punto manual en Santa Cruz de la Sierra",
      coordinates: { latitude: -17.7833, longitude: -63.1821 },
      department: "Santa Cruz",
      locationCellLabel: "Departamento de Santa Cruz",
      municipality: "Santa Cruz de la Sierra",
    });
  });

  it("keeps manual choices visible and does not confirm an out-of-Bolivia map pin", () => {
    const onConfirm = vi.fn();
    const adapter = createNearbyLocationAdapterBoundary();
    const screen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        initialMapCoordinate={{ latitude: -34.6037, longitude: -58.3816 }}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );
    const mapOption = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Marcar punto exacto en La Paz",
    );

    void getPressableOnPress(mapOption)();

    const mapScreen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        initialMapCoordinate={{ latitude: -34.6037, longitude: -58.3816 }}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );
    const confirmPinButton = findElement(
      mapScreen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Confirmar punto elegido",
    );

    void getPressableOnPress(confirmPinButton)();

    const recoverableScreen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        initialMapCoordinate={{ latitude: -34.6037, longitude: -58.3816 }}
        manualLocationOptions={manualLocationOptions}
        onConfirm={onConfirm}
      />,
    );

    expect(onConfirm).not.toHaveBeenCalled();
    expect(findText(recoverableScreen, "Elige una ubicacion en Bolivia")).toBe(
      true,
    );
    expect(
      findText(
        recoverableScreen,
        "Elige una ubicacion dentro de Bolivia para continuar con el reporte.",
      ),
    ).toBe(true);
    expect(findText(recoverableScreen, "La Paz")).toBe(true);
    expect(findText(recoverableScreen, "Marcar punto exacto en el mapa")).toBe(
      true,
    );
  });

  it("keeps manual place options visible when the map provider is unavailable", () => {
    const adapter = createNearbyLocationAdapterBoundary();
    const screen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        mapProviderState={{
          kind: "error",
          message: "Configura mapas nativos para elegir un pin.",
        }}
        onConfirm={() => undefined}
      />,
    );
    const mapOption = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Marcar punto exacto en La Paz",
    );

    void getPressableOnPress(mapOption)();

    const mapErrorScreen = renderScreen(
      <ReportLocationPickerScreen
        adapter={adapter}
        manualLocationOptions={manualLocationOptions}
        mapProviderState={{
          kind: "error",
          message: "Configura mapas nativos para elegir un pin.",
        }}
        onConfirm={() => undefined}
      />,
    );

    expect(findText(mapErrorScreen, "Mapa no disponible")).toBe(true);
    expect(
      findText(mapErrorScreen, "Configura mapas nativos para elegir un pin."),
    ).toBe(true);
    expect(findText(mapErrorScreen, "Volver a la lista")).toBe(true);
    expect(findText(mapErrorScreen, "La Paz")).toBe(true);
    expect(findText(mapErrorScreen, "Marcar punto exacto en el mapa")).toBe(
      true,
    );
  });
});

const manualLocationOptions = [
  {
    coordinates: { latitude: -16.4897, longitude: -68.1193 },
    countryCode: "BO",
    department: "La Paz",
    label: "La Paz",
    locationCellLabel: "La Paz",
    manualLocationKind: "place",
    municipality: "La Paz",
    source: "manual",
  },
  {
    coordinates: { latitude: -17.7833, longitude: -63.1821 },
    countryCode: "BO",
    department: "Santa Cruz",
    label: "Santa Cruz de la Sierra",
    locationCellLabel: "Santa Cruz de la Sierra",
    manualLocationKind: "place",
    municipality: "Santa Cruz de la Sierra",
    source: "manual",
  },
  {
    countryCode: "BO",
    label: "Elegir punto en el mapa",
    locationCellLabel: "Punto elegido",
    manualLocationKind: "map-pin",
    source: "manual",
  },
] as const;

function createNearbyLocationAdapterBoundary() {
  return {
    resolveForegroundLocation: vi.fn(),
  };
}

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

type TestElement = React.ReactElement<ElementProps>;

function renderScreen(node: React.ReactNode): React.ReactNode {
  reactState.cursor = 0;

  return renderFunctionElement(node);
}

function renderFunctionElement(node: React.ReactNode): React.ReactNode {
  let current = node;

  while (
    React.isValidElement<ElementProps>(current) &&
    typeof current.type === "function"
  ) {
    const Component = current.type as (props: ElementProps) => React.ReactNode;

    current = Component(current.props);
  }

  return current;
}

function findText(node: React.ReactNode, text: string): boolean {
  const rendered = renderFunctionElement(node);

  if (typeof rendered === "string") {
    return rendered.includes(text);
  }

  if (typeof rendered === "number") {
    return String(rendered).includes(text);
  }

  if (!React.isValidElement<ElementProps>(rendered)) {
    return false;
  }

  if (elementContainsText(rendered, text)) {
    return true;
  }

  return React.Children.toArray(rendered.props.children).some((child) =>
    findText(child, text),
  );
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

function getPressableOnPress(element: TestElement | undefined) {
  const onPress = element?.props.onPress;

  if (typeof onPress !== "function") {
    throw new Error("Expected Pressable onPress handler.");
  }

  return onPress as () => Promise<void> | void;
}

function elementContainsText(element: TestElement, text: string): boolean {
  return React.Children.toArray(element.props.children).some((child) => {
    if (typeof child === "string") {
      return child.includes(text);
    }

    if (typeof child === "number") {
      return String(child).includes(text);
    }

    return false;
  });
}
