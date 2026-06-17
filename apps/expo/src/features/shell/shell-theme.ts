import type { ReportIntent } from "../../i18n";

export const shellColors = {
  background: "#F7F9F6",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF3EE",
  border: "#DCE4DE",
  text: "#17201C",
  muted: "#66736D",
  primary: "#146C5A",
  primaryDark: "#0E5145",
  primarySoft: "#DDEFE9",
  found: "#1D7A52",
  sighting: "#2E6D9E",
  lost: "#D6453D",
  adoption: "#9D4F66",
  white: "#FFFFFF",
};

export const reportIntentColors: Record<
  ReportIntent,
  {
    background: string;
    foreground: string;
    iconBackground: string;
    border: string;
  }
> = {
  lost: {
    background: shellColors.primary,
    foreground: shellColors.white,
    iconBackground: "rgba(255, 255, 255, 0.18)",
    border: shellColors.primary,
  },
  found: {
    background: shellColors.sighting,
    foreground: shellColors.white,
    iconBackground: "rgba(255, 255, 255, 0.18)",
    border: shellColors.sighting,
  },
  sighting: {
    background: shellColors.found,
    foreground: shellColors.white,
    iconBackground: "rgba(255, 255, 255, 0.18)",
    border: shellColors.found,
  },
  adoption: {
    background: "#DDEFE9",
    foreground: shellColors.primaryDark,
    iconBackground: "rgba(20, 108, 90, 0.12)",
    border: "#A9D4C9",
  },
};
