import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { ManualLocationPickerMap } from "./location-picker-map";

(globalThis as { React?: typeof React }).React = React;

vi.mock("react-native", () => ({
  Platform: {
    OS: "android",
  },
  Pressable: "Pressable",
  StyleSheet: {
    absoluteFillObject: {},
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  View: "View",
}));

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        maps: {
          androidGoogleMapsConfigured: true,
        },
      },
    },
  },
}));

vi.mock("react-native-maps", () => ({
  default: "MapView",
  Marker: "Marker",
  PROVIDER_GOOGLE: "google",
}));

describe("ManualLocationPickerMap", () => {
  it("turns map taps, dragged pins, and confirm into a manual NearbySearchLocation", () => {
    const onConfirm = vi.fn();
    const onSelectedCoordinateChange = vi.fn();
    const screen = renderFunctionElement(
      <ManualLocationPickerMap
        onConfirm={onConfirm}
        onSelectedCoordinateChange={onSelectedCoordinateChange}
        selectedCoordinate={{ latitude: -16.5022, longitude: -68.1213 }}
      />,
    );
    const map = findElement(screen, (element) => element.type === "MapView");
    const marker = findElement(screen, (element) => element.type === "Marker");
    const confirmButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Confirmar punto elegido",
    );

    const nextCoordinate = { latitude: -16.51, longitude: -68.12 };

    expect(marker?.props.coordinate).toEqual({
      latitude: -16.5022,
      longitude: -68.1213,
    });
    expect(marker?.props.draggable).toBe(true);
    expect(marker?.props.title).toBe("Zona elegida");
    expect(map?.props.provider).toBe("google");
    expect(findText(screen, "Zona elegida en el mapa")).toBe(true);
    expect(findText(screen, "Confirmar zona")).toBe(true);
    expect(findTextContaining(screen, "Pin manual")).toBe(false);
    expect(findTextContaining(screen, "-16.5022")).toBe(false);

    const mapPress = map?.props.onPress;

    if (typeof mapPress !== "function") {
      throw new Error("Expected map tap handler.");
    }

    (mapPress as (event: MapCoordinateEvent) => void)({
      nativeEvent: { coordinate: nextCoordinate },
    });
    expect(onSelectedCoordinateChange).toHaveBeenCalledWith(nextCoordinate);

    const dragEnd = marker?.props.onDragEnd;

    if (typeof dragEnd !== "function") {
      throw new Error("Expected marker drag handler.");
    }

    (dragEnd as (event: MapCoordinateEvent) => void)({
      nativeEvent: { coordinate: nextCoordinate },
    });
    expect(onSelectedCoordinateChange).toHaveBeenCalledWith(nextCoordinate);

    const confirmPress = confirmButton?.props.onPress;

    if (typeof confirmPress !== "function") {
      throw new Error("Expected confirm action.");
    }

    (confirmPress as () => void)();
    expect(onConfirm).toHaveBeenCalledWith({
      coordinates: { latitude: -16.5022, longitude: -68.1213 },
      countryCode: "BO",
      label: "Zona elegida en el mapa",
      locationCellLabel: "Zona elegida",
      manualLocationKind: "map-pin",
      source: "manual",
    });
  });

  it("uses distinct back-to-list copy for nested map cancellation", () => {
    const screen = renderFunctionElement(
      <ManualLocationPickerMap
        cancelAccessibilityLabel="Volver a la lista de ubicaciónes"
        cancelLabel="Volver a la lista"
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onSelectedCoordinateChange={() => undefined}
        providerState={{
          kind: "error",
          message: "El mapa no está disponible en este dispositivo.",
        }}
        selectedCoordinate={{ latitude: -16.5022, longitude: -68.1213 }}
      />,
    );
    const backToListButton = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Volver a la lista de ubicaciónes",
    );

    expect(
      findElement(screen, (element) => element.type === "MapView"),
    ).toBeUndefined();
    expect(findText(screen, "Mapa no disponible")).toBe(true);
    expect(
      findText(screen, "El mapa no está disponible en este dispositivo."),
    ).toBe(true);
    expect(findText(screen, "Volver a la lista")).toBe(true);
    expect(backToListButton).toBeDefined();
    expect(findText(screen, "Cancelar")).toBe(false);
  });
});

interface MapCoordinateEvent {
  nativeEvent: {
    coordinate: {
      latitude: number;
      longitude: number;
    };
  };
}

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

function findTextContaining(node: React.ReactNode, text: string): boolean {
  const rendered = renderFunctionElement(node);

  if (typeof rendered === "string") {
    return rendered.includes(text);
  }

  if (!React.isValidElement<ElementProps>(rendered)) {
    return false;
  }

  return React.Children.toArray(rendered.props.children).some((child) =>
    findTextContaining(child, text),
  );
}
