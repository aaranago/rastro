import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import type { ReportMapPin, ReportMapPreview } from "./report-map";
import { clusterReportMapPins, ReportMap } from "./report-map";

(globalThis as { React?: typeof React }).React = React;

vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    absoluteFillObject: {},
    create: <TStyles extends Record<string, unknown>>(styles: TStyles) =>
      styles,
  },
  Text: "Text",
  View: "View",
}));

vi.mock("react-native-maps", () => ({
  default: "MapView",
  Marker: "Marker",
  PROVIDER_GOOGLE: "google",
}));

describe("ReportMap", () => {
  it("renders native map markers and keeps marker and list selection synchronized", () => {
    const onSelectReport = vi.fn();
    const pins: ReportMapPin[] = [
      {
        coordinate: { latitude: -16.5405, longitude: -68.0889 },
        id: "lost-bruno",
        label: "Achumani",
        title: "Bruno",
      },
      {
        coordinate: { latitude: -16.5103, longitude: -68.1299 },
        id: "lost-luna",
        label: "Sopocachi",
        title: "Luna",
      },
    ];
    const previews: ReportMapPreview[] = [
      {
        id: "lost-bruno",
        locationLabel: "Achumani · zona aproximada",
        metaLabel: "a 300 m",
        summary: "Collar azul con plaquita.",
        title: "Bruno",
      },
      {
        id: "lost-luna",
        locationLabel: "Sopocachi · zona aproximada",
        metaLabel: "a 2 km",
        summary: "Se escapo durante la lluvia.",
        title: "Luna",
      },
    ];

    const screen = renderFunctionElement(
      <ReportMap
        currentLocation={{
          coordinate: { latitude: -16.5, longitude: -68.1193 },
          label: "Zona Sur",
        }}
        onSelectReport={onSelectReport}
        pins={pins}
        previews={previews}
        selectedReportId="lost-bruno"
      />,
    );
    const markers = findElements(
      screen,
      (element) => element.type === "Marker",
    );
    const selectedListItem = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Seleccionar Bruno",
    );
    const lunaListItem = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Seleccionar Luna",
    );

    expect(
      findElement(screen, (element) => element.type === "MapView"),
    ).toBeDefined();
    expect(markers).toHaveLength(3);
    expect(markers[0]?.props.coordinate).toEqual({
      latitude: -16.5405,
      longitude: -68.0889,
    });
    expect(selectedListItem?.props.accessibilityState).toEqual({
      selected: true,
    });

    const markerPress = markers[1]?.props.onPress;

    if (typeof markerPress !== "function") {
      throw new Error("Expected marker to be selectable.");
    }

    (markerPress as () => void)();
    expect(onSelectReport).toHaveBeenCalledWith("lost-luna");

    const listPress = lunaListItem?.props.onPress;

    if (typeof listPress !== "function") {
      throw new Error("Expected list alternative to be selectable.");
    }

    (listPress as () => void)();
    expect(onSelectReport).toHaveBeenCalledWith("lost-luna");
  });

  it("shows provider errors without removing the accessible report list", () => {
    const onSelectReport = vi.fn();
    const screen = renderFunctionElement(
      <ReportMap
        onSelectReport={onSelectReport}
        pins={[
          {
            coordinate: { latitude: -16.5405, longitude: -68.0889 },
            id: "lost-bruno",
            label: "Achumani",
            title: "Bruno",
          },
        ]}
        previews={[
          {
            id: "lost-bruno",
            locationLabel: "Achumani · zona aproximada",
            summary: "Collar azul con plaquita.",
            title: "Bruno",
          },
        ]}
        providerState={{
          kind: "error",
          message: "Configura EXPO_ANDROID_GOOGLE_MAPS_API_KEY.",
        }}
        selectedReportId="lost-bruno"
      />,
    );
    const listItem = findElement(
      screen,
      (element) =>
        element.type === "Pressable" &&
        element.props.accessibilityLabel === "Seleccionar Bruno",
    );

    expect(
      findElement(screen, (element) => element.type === "MapView"),
    ).toBeUndefined();
    expect(findText(screen, "No pudimos cargar el mapa")).toBe(true);
    expect(listItem?.props.accessibilityState).toEqual({ selected: true });
  });

  it("groups same or near coordinates into one counted marker group", () => {
    const groups = clusterReportMapPins([
      {
        coordinate: { latitude: -16.54051, longitude: -68.08891 },
        id: "lost-bruno",
        label: "Achumani",
        title: "Bruno",
      },
      {
        coordinate: { latitude: -16.54053, longitude: -68.08894 },
        id: "found-max",
        label: "Achumani",
        title: "Max",
      },
      {
        coordinate: { latitude: -16.5103, longitude: -68.1299 },
        id: "lost-luna",
        label: "Sopocachi",
        title: "Luna",
      },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      pins: [{ id: "lost-bruno" }, { id: "found-max" }],
      title: "2 reportes",
    });
  });

  it("preserves controlled camera center and reports camera changes", () => {
    const onCameraCenterChange = vi.fn();
    const screen = renderFunctionElement(
      <ReportMap
        cameraCenter={{ latitude: -16.51, longitude: -68.12 }}
        onCameraCenterChange={onCameraCenterChange}
        onSelectReport={() => undefined}
        pins={[]}
        previews={[]}
      />,
    );
    const map = findElement(screen, (element) => element.type === "MapView");

    expect(map?.props.region).toMatchObject({
      latitude: -16.51,
      longitude: -68.12,
    });

    const onRegionChangeComplete = map?.props.onRegionChangeComplete;

    if (typeof onRegionChangeComplete !== "function") {
      throw new Error("Expected camera change handler.");
    }

    (onRegionChangeComplete as (region: MapRegion) => void)({
      latitude: -16.52,
      latitudeDelta: 0.04,
      longitude: -68.13,
      longitudeDelta: 0.04,
    });

    expect(onCameraCenterChange).toHaveBeenCalledWith({
      latitude: -16.52,
      longitude: -68.13,
    });
  });
});

interface MapRegion {
  latitude: number;
  latitudeDelta: number;
  longitude: number;
  longitudeDelta: number;
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
  return findElements(node, predicate)[0];
}

function findElements(
  node: React.ReactNode,
  predicate: (element: TestElement) => boolean,
): TestElement[] {
  const rendered = renderFunctionElement(node);

  if (!React.isValidElement<ElementProps>(rendered)) {
    return [];
  }

  const ownMatch = predicate(rendered) ? [rendered] : [];
  const childMatches = React.Children.toArray(rendered.props.children).flatMap(
    (child) => findElements(child, predicate),
  );

  return [...ownMatch, ...childMatches];
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
