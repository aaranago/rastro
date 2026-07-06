import type { MaterialCommunityIconName } from "../icons/safe-material-community-icon";
import * as React from "react";
import { Image } from "expo-image";
import { Platform, StyleSheet, Text } from "react-native";

import { SafeMaterialCommunityIcon } from "../icons/safe-material-community-icon";

// The Expo test transform still evaluates this JSX through the classic runtime.
void React;

export interface IconProps {
  name: string;
  color: string;
  fallback?: string;
  size?: number;
}

const androidIconFallbacks: Record<string, string> = {
  "arrow.right": "->",
  "arrow.right.to.line": "->",
  "bell.fill": "!",
  "checkmark.seal.fill": "OK",
  "chevron.left": "<",
  "chevron.right": ">",
  "eye.fill": "o",
  "heart.fill": "<3",
  "lock.fill": "*",
  "megaphone.fill": "!",
  "person.badge.plus": "+",
  "person.crop.circle.badge.plus": "+",
  sparkles: "*",
  xmark: "x",
};

const androidVectorIconNames: Record<string, MaterialCommunityIconName> = {
  "arrow.clockwise": "refresh",
  "arrow.left": "arrow-left",
  "arrow.right": "arrow-right",
  "arrow.right.to.line": "login",
  "arrow.triangle.2.circlepath": "sync",
  "arrow.up.right": "arrow-top-right",
  "bell.badge.fill": "bell-badge",
  "bell.fill": "bell",
  "bell.slash.fill": "bell-off",
  "bubble.left.and.phone.fill": "phone-message",
  "camera.fill": "camera",
  "checkmark.circle.fill": "check-circle",
  "checkmark.seal.fill": "check-decagram",
  "chevron.left": "chevron-left",
  "chevron.right": "chevron-right",
  "circle.grid.2x2.fill": "view-grid",
  "cross.case.fill": "medical-bag",
  "doc.text.image.fill": "file-image",
  "exclamationmark.bubble.fill": "message-alert",
  "exclamationmark.triangle.fill": "alert",
  "eye.fill": "eye",
  "figure.walk.motion": "walk",
  "gearshape.fill": "cog",
  "hands.sparkles.fill": "hand-heart",
  "heart.fill": "heart",
  "heart.text.square.fill": "heart-box",
  hourglass: "timer-sand",
  "house.fill": "home",
  "info.circle.fill": "information",
  "key.fill": "key",
  "list.bullet": "format-list-bulleted",
  "list.bullet.rectangle": "format-list-bulleted-square",
  "location.fill": "map-marker",
  "location.fill.viewfinder": "crosshairs-gps",
  "location.magnifyingglass": "map-search",
  "location.slash.fill": "map-marker-off",
  "lock.fill": "lock",
  magnifyingglass: "magnify",
  "map.fill": "map",
  mappin: "map-marker",
  "megaphone.fill": "bullhorn",
  "message.fill": "message",
  "paperplane.fill": "send",
  pawprint: "paw",
  "pawprint.fill": "paw",
  "person.badge.plus": "account-plus",
  "person.crop.circle": "account-circle-outline",
  "person.crop.circle.fill": "account-circle",
  "person.crop.circle.badge.checkmark": "account-check",
  "person.crop.circle.badge.exclamationmark": "account-alert",
  "person.crop.circle.badge.plus": "account-plus",
  "person.fill.checkmark": "account-check",
  "phone.fill": "phone",
  plus: "plus",
  "questionmark.circle.fill": "help-circle",
  "rectangle.portrait.and.arrow.right": "logout",
  scope: "crosshairs",
  sparkles: "star-four-points",
  "square.and.arrow.up": "share-variant",
  "square.and.pencil": "square-edit-outline",
  "star.fill": "star",
  stethoscope: "stethoscope",
  "takeoutbag.and.cup.and.straw.fill": "storefront",
  "trash.fill": "delete",
  "tray.fill": "tray-full",
  xmark: "close",
};

export function ShellIcon({ name, color, fallback, size = 22 }: IconProps) {
  const resolvedFallback = fallback ?? androidIconFallbacks[name];
  const androidIconName = androidVectorIconNames[name];

  if (Platform.OS !== "ios" && androidIconName) {
    return (
      <SafeMaterialCommunityIcon
        accessibilityElementsHidden
        color={color}
        fallback={resolvedFallback}
        importantForAccessibility="no"
        name={androidIconName}
        size={size}
      />
    );
  }

  if (Platform.OS !== "ios" && resolvedFallback) {
    return (
      <Text
        maxFontSizeMultiplier={1}
        style={[
          styles.iconFallback,
          {
            color,
            fontSize:
              resolvedFallback.length > 1 ? Math.max(9, size * 0.34) : size,
            height: size,
            lineHeight: size,
            width: size,
          },
        ]}
      >
        {resolvedFallback}
      </Text>
    );
  }

  return (
    <Image
      contentFit="contain"
      source={`sf:${name}`}
      style={{ height: size, width: size }}
      tintColor={color}
    />
  );
}

const styles = StyleSheet.create({
  iconFallback: {
    fontWeight: "900",
    textAlign: "center",
  },
});
