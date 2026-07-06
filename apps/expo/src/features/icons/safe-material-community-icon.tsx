import type { ComponentProps } from "react";
import * as React from "react";
import { StyleSheet, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export type MaterialCommunityIconName = ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

type IconFontStatus = "failed" | "idle" | "loaded" | "loading";

interface TextIconProps {
  accessibilityElementsHidden?: boolean;
  color: string;
  importantForAccessibility?: "auto" | "no" | "no-hide-descendants" | "yes";
  label: string;
  size?: number;
  testID?: string;
}

export type SafeMaterialCommunityIconProps = Omit<
  ComponentProps<typeof MaterialCommunityIcons>,
  "color" | "name" | "size"
> & {
  color: string;
  fallback?: string;
  name: MaterialCommunityIconName;
  size?: number;
};

const fallbackLabels: Partial<Record<MaterialCommunityIconName, string>> = {
  alert: "!",
  "arrow-left": "<",
  "arrow-right": ">",
  "arrow-top-right": "^",
  "bell-badge": "!",
  bell: "!",
  "bell-off": "!",
  bullhorn: "!",
  camera: "C",
  car: "C",
  "check-circle": "OK",
  "check-decagram": "OK",
  "chevron-left": "<",
  "chevron-right": ">",
  close: "x",
  "content-cut": "S",
  "crosshairs-gps": "+",
  eye: "o",
  "file-image": "I",
  "format-list-bulleted": "=",
  "format-list-bulleted-square": "=",
  "hand-heart": "+",
  "heart-box": "H",
  "home-heart": "H",
  home: "H",
  information: "i",
  lock: "*",
  login: ">",
  magnify: "?",
  map: "M",
  "map-marker": "P",
  "map-marker-off": "P",
  "map-search": "?",
  "medical-bag": "+",
  message: "M",
  "message-alert": "!",
  "phone-message": "M",
  phone: "T",
  plus: "+",
  refresh: "R",
  send: ">",
  "share-variant": "^",
  "square-edit-outline": "E",
  star: "*",
  "star-four-points": "*",
  stethoscope: "+",
  sync: "R",
  "timer-sand": "T",
  "view-grid": "#",
  walk: "W",
};

let materialCommunityIconFontStatus: IconFontStatus = "idle";
let materialCommunityIconFontPromise: Promise<void> | undefined;
const materialCommunityIconFontListeners = new Set<
  (status: IconFontStatus) => void
>();

export function SafeMaterialCommunityIcon({
  color,
  fallback,
  name,
  size = 20,
  ...iconProps
}: SafeMaterialCommunityIconProps) {
  const fontStatus = useMaterialCommunityIconFontStatus();

  if (fontStatus === "loaded") {
    return React.createElement(MaterialCommunityIcons, {
      color,
      name,
      size,
      ...iconProps,
    });
  }

  return React.createElement(TextIcon, {
    accessibilityElementsHidden: iconProps.accessibilityElementsHidden,
    color,
    importantForAccessibility: iconProps.importantForAccessibility,
    label: fallback ?? fallbackLabels[name] ?? "*",
    size,
    testID: iconProps.testID,
  });
}

function TextIcon({
  accessibilityElementsHidden,
  color,
  importantForAccessibility,
  label,
  size = 20,
  testID,
}: TextIconProps) {
  return React.createElement(
    Text,
    {
      accessibilityElementsHidden,
      importantForAccessibility,
      maxFontSizeMultiplier: 1,
      style: [
        styles.textIcon,
        {
          color,
          fontSize: label.length > 1 ? Math.max(9, size * 0.42) : size * 0.8,
          height: size,
          lineHeight: size,
          width: size,
        },
      ],
      testID,
    },
    label,
  );
}

function useMaterialCommunityIconFontStatus(): IconFontStatus {
  const [fontStatus, setFontStatus] = React.useState(
    materialCommunityIconFontStatus,
  );

  React.useEffect(() => {
    let isMounted = true;

    const handleStatusChange = (nextStatus: IconFontStatus) => {
      if (isMounted) {
        setFontStatus(nextStatus);
      }
    };

    materialCommunityIconFontListeners.add(handleStatusChange);
    void loadMaterialCommunityIconFont().then(handleStatusChange);

    return () => {
      isMounted = false;
      materialCommunityIconFontListeners.delete(handleStatusChange);
    };
  }, []);

  return fontStatus;
}

function setMaterialCommunityIconFontStatus(nextStatus: IconFontStatus) {
  if (materialCommunityIconFontStatus === nextStatus) {
    return;
  }

  materialCommunityIconFontStatus = nextStatus;
  for (const listener of materialCommunityIconFontListeners) {
    listener(nextStatus);
  }
}

async function loadMaterialCommunityIconFont(): Promise<IconFontStatus> {
  if (materialCommunityIconFontStatus === "loaded") {
    return "loaded";
  }

  if (materialCommunityIconFontStatus === "failed") {
    return "failed";
  }

  if (!materialCommunityIconFontPromise) {
    setMaterialCommunityIconFontStatus("loading");
    materialCommunityIconFontPromise =
      typeof MaterialCommunityIcons.loadFont === "function"
        ? MaterialCommunityIcons.loadFont()
            .then(() => {
              setMaterialCommunityIconFontStatus("loaded");
            })
            .catch(() => {
              setMaterialCommunityIconFontStatus("failed");
            })
        : Promise.resolve().then(() => {
            setMaterialCommunityIconFontStatus("failed");
          });
  }

  await materialCommunityIconFontPromise;

  return materialCommunityIconFontStatus;
}

const styles = StyleSheet.create({
  textIcon: {
    fontWeight: "900",
    textAlign: "center",
  },
});
