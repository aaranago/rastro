"use client";

import { usePathname } from "next/navigation";

import { Button } from "@acme/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@acme/ui/dropdown-menu";
import type { ThemeMode } from "@acme/ui/theme";
import { useTheme } from "@acme/ui/theme";

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

export function AdminNavigationWithPathname() {
  const pathname = usePathname();

  return <AdminNavigation currentPathname={pathname} />;
}

export function AdminHeaderThemeToggle() {
  const { setTheme, themeMode } = useTheme();
  const selectedTheme =
    adminThemeOptions.find((option) => option.mode === themeMode) ??
    defaultAdminThemeOption;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Cambiar tema de color. Tema actual: ${selectedTheme.screenReaderLabel}`}
          className="min-h-11 min-w-28 px-3"
          type="button"
          variant="outline"
        >
          {selectedTheme.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {adminThemeOptions.map((option) => (
          <DropdownMenuItem
            aria-label={`Usar tema ${option.screenReaderLabel}`}
            key={option.mode}
            onClick={() => setTheme(option.mode)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
