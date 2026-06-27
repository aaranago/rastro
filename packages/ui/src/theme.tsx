"use client";

import * as React from "react";
import { DesktopIcon, MoonIcon, SunIcon } from "@radix-ui/react-icons";
import * as z from "zod/v4";

import type { ResolvedTheme, ThemeMode } from "./theme-script";
import { Button } from "./button";
import { themeKey, themeModes } from "./theme-script";

const ThemeModeSchema = z.enum(themeModes);

export type { ResolvedTheme, ThemeMode } from "./theme-script";

const getStoredThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") return "auto";
  try {
    const storedTheme = localStorage.getItem(themeKey);
    return ThemeModeSchema.parse(storedTheme);
  } catch {
    return "auto";
  }
};

const setStoredThemeMode = (theme: ThemeMode) => {
  try {
    const parsedTheme = ThemeModeSchema.parse(theme);
    localStorage.setItem(themeKey, parsedTheme);
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

const getSystemTheme = () => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const updateThemeClass = (themeMode: ThemeMode) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "auto");
  const newTheme = themeMode === "auto" ? getSystemTheme() : themeMode;
  root.classList.add(newTheme);

  if (themeMode === "auto") {
    root.classList.add("auto");
  }
};

const setupPreferredListener = () => {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => updateThemeClass("auto");
  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
};

const getNextTheme = (current: ThemeMode): ThemeMode => {
  const themes: ThemeMode[] =
    getSystemTheme() === "dark"
      ? ["auto", "light", "dark"]
      : ["auto", "dark", "light"];
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return themes[(themes.indexOf(current) + 1) % themes.length]!;
};

interface ThemeContextProps {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleMode: () => void;
}
const ThemeContext = React.createContext<ThemeContextProps | undefined>(
  undefined,
);

export function ThemeProvider({ children }: React.PropsWithChildren) {
  const [themeMode, setThemeMode] = React.useState<ThemeMode>("auto");
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    const storedTheme = getStoredThemeMode();

    setThemeMode(storedTheme);
    updateThemeClass(storedTheme);
    setHasMounted(true);
  }, []);

  React.useEffect(() => {
    if (!hasMounted) return;
    if (themeMode !== "auto") return;
    return setupPreferredListener();
  }, [hasMounted, themeMode]);

  React.useEffect(() => {
    if (!hasMounted) return;
    updateThemeClass(themeMode);
  }, [hasMounted, themeMode]);

  const resolvedTheme = themeMode === "auto" ? getSystemTheme() : themeMode;

  const setTheme = (newTheme: ThemeMode) => {
    setThemeMode(newTheme);
    setStoredThemeMode(newTheme);
    updateThemeClass(newTheme);
  };

  const toggleMode = () => {
    setTheme(getNextTheme(themeMode));
  };

  return (
    <ThemeContext
      value={{
        themeMode,
        resolvedTheme,
        setTheme,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = React.use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeToggle() {
  const { toggleMode } = useTheme();

  return (
    <Button
      aria-label="Cambiar tema de color"
      className="[&>svg]:absolute [&>svg]:size-5 [&>svg]:scale-0"
      onClick={toggleMode}
      size="icon"
      type="button"
      variant="outline"
    >
      <SunIcon className="light:scale-100! auto:scale-0!" />
      <MoonIcon className="auto:scale-0! dark:scale-100!" />
      <DesktopIcon className="auto:scale-100!" />
      <span className="sr-only">Cambiar tema de color</span>
    </Button>
  );
}
