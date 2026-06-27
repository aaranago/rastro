"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import type { ThemeMode } from "@acme/ui/theme-script";
import { Button } from "@acme/ui/button";
import { themeKey } from "@acme/ui/theme-script";

import { AdminNavigation } from "./admin-navigation";

interface AdminThemeOption {
  label: string;
  mode: ThemeMode;
  screenReaderLabel: string;
}

const defaultAdminThemeOption: AdminThemeOption = {
  label: "Sistema",
  mode: "auto",
  screenReaderLabel: "automático",
};

const adminThemeOptions: readonly AdminThemeOption[] = [
  {
    label: "Claro",
    mode: "light",
    screenReaderLabel: "claro",
  },
  {
    label: "Oscuro",
    mode: "dark",
    screenReaderLabel: "oscuro",
  },
  defaultAdminThemeOption,
];

const adminThemeModes = new Set<ThemeMode>(
  adminThemeOptions.map((option) => option.mode),
);

const readStoredAdminThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") return defaultAdminThemeOption.mode;

  try {
    const storedMode = localStorage.getItem(themeKey);
    return adminThemeModes.has(storedMode as ThemeMode)
      ? (storedMode as ThemeMode)
      : defaultAdminThemeOption.mode;
  } catch {
    return defaultAdminThemeOption.mode;
  }
};

const getSystemTheme = () => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const updateAdminThemeClass = (mode: ThemeMode) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "auto");

  if (mode === "auto") {
    root.classList.add(getSystemTheme(), "auto");
    return;
  }

  root.classList.add(mode);
};

const storeAdminThemeMode = (mode: ThemeMode) => {
  try {
    localStorage.setItem(themeKey, mode);
  } catch {
    // Ignore unavailable storage; the current page can still update visually.
  }
};

export function AdminNavigationWithPathname() {
  const pathname = usePathname();

  return <AdminNavigation currentPathname={pathname} />;
}

export function AdminHeaderThemeToggle() {
  const [selectedMode, setSelectedMode] = React.useState<ThemeMode>(
    defaultAdminThemeOption.mode,
  );

  React.useEffect(() => {
    const storedMode = readStoredAdminThemeMode();
    setSelectedMode(storedMode);
    updateAdminThemeClass(storedMode);
  }, []);

  const handleThemeChange = (mode: ThemeMode) => {
    setSelectedMode(mode);
    storeAdminThemeMode(mode);
    updateAdminThemeClass(mode);
  };

  return (
    <div
      aria-label="Cambiar tema de color"
      className="border-border bg-background/80 grid grid-cols-3 rounded-md border p-1"
      role="group"
    >
      {adminThemeOptions.map((option) => (
        <Button
          aria-label={`Usar tema ${option.screenReaderLabel}`}
          aria-pressed={selectedMode === option.mode}
          className="h-8 min-w-0 rounded-sm px-2 text-xs sm:px-3"
          key={option.mode}
          onClick={() => handleThemeChange(option.mode)}
          type="button"
          variant={selectedMode === option.mode ? "default" : "ghost"}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
