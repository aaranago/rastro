"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ThemeMode } from "@acme/ui/theme-script";
import { cn } from "@acme/ui";
import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@acme/ui/sheet";
import { themeKey } from "@acme/ui/theme-script";

import type { AdminShellViewerRole } from "./admin-shell";
import {
  AdminNavigation,
  adminNavigationItems,
  getAdminNavigationItemForPathname,
} from "./admin-navigation";

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

const adminNavigationFallbackItem = adminNavigationItems[0] ?? {
  description: "Panel de administración de Rastro.",
  href: "/admin",
  label: "Admin",
};

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

export function AdminShellFrame(props: {
  children: React.ReactNode;
  displayName: string;
  roleLabel: string;
  viewerRole: AdminShellViewerRole;
}) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] =
    React.useState(false);

  return (
    <div
      className={cn(
        "lg:grid lg:min-h-screen",
        isSidebarCollapsed
          ? "lg:grid-cols-[88px_minmax(0,1fr)]"
          : "lg:grid-cols-[280px_minmax(0,1fr)]",
      )}
    >
      <aside className="border-border bg-background/95 hidden px-4 py-4 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:flex-col lg:border-r lg:px-5 lg:py-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div
            className={cn(
              "min-w-0",
              isSidebarCollapsed && "lg:flex lg:justify-center",
            )}
          >
            <p
              className={cn(
                "text-primary text-sm font-semibold",
                isSidebarCollapsed && "lg:sr-only",
              )}
            >
              Administración Rastro
            </p>
            <h1
              className={cn(
                "mt-1 truncate text-xl font-semibold tracking-normal",
                isSidebarCollapsed && "lg:sr-only",
              )}
            >
              Operación es-BO
            </h1>
            <span
              aria-hidden="true"
              className={cn(
                "bg-primary text-primary-foreground hidden size-10 items-center justify-center rounded-md text-sm font-semibold",
                isSidebarCollapsed && "lg:flex",
              )}
            >
              RA
            </span>
            <p
              className={cn(
                "text-muted-foreground mt-2 text-sm",
                isSidebarCollapsed && "lg:sr-only",
              )}
            >
              Panel interno para moderación, proveedores y seguridad.
            </p>
          </div>
          <AdminNavigation
            collapsed={isSidebarCollapsed}
            currentPathname={pathname}
          />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-border bg-background/95 sticky top-0 z-20 border-b px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <AdminMobileNavigationDrawer
                currentPathname={pathname}
                onOpenChange={setIsMobileNavigationOpen}
                open={isMobileNavigationOpen}
              />
              <Button
                aria-label={
                  isSidebarCollapsed
                    ? "Expandir barra lateral"
                    : "Contraer barra lateral"
                }
                className="hidden lg:inline-flex"
                onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
                size="icon"
                type="button"
                variant="outline"
              >
                <CollapseGlyph collapsed={isSidebarCollapsed} />
              </Button>
              <AdminBreadcrumbs pathname={pathname} />
            </div>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:justify-end">
              <AdminHeaderCommandSearch pathname={pathname} />
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-0 truncate text-sm font-medium">
                  {props.displayName}
                </span>
                <Badge
                  variant={
                    props.viewerRole === "admin" ? "default" : "secondary"
                  }
                >
                  {props.roleLabel}
                </Badge>
                <span className="text-muted-foreground text-sm">Tema</span>
                <AdminHeaderThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {props.children}
        </main>
      </div>
    </div>
  );
}

function AdminMobileNavigationDrawer(props: {
  currentPathname: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetTrigger asChild>
        <Button
          aria-label="Abrir navegación"
          className="lg:hidden"
          size="icon"
          type="button"
          variant="outline"
        >
          <MenuGlyph />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
        showCloseButton={false}
        side="left"
      >
        <SheetHeader className="border-border border-b p-4 pr-14">
          <SheetTitle>Administración Rastro</SheetTitle>
          <SheetClose asChild>
            <Button
              aria-label="Cerrar navegación"
              className="absolute top-3 right-3"
              size="icon"
              type="button"
              variant="ghost"
            >
              <CloseGlyph />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="min-w-0 p-4">
          <AdminNavigation
            currentPathname={props.currentPathname}
            onNavigate={() => props.onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AdminBreadcrumbs(props: { pathname: string }) {
  const currentItem =
    getAdminNavigationItemForPathname(props.pathname) ??
    adminNavigationFallbackItem;
  const isRoot = currentItem.href === "/admin";

  return (
    <nav
      aria-label="Ruta de administración"
      className="min-w-0 overflow-hidden"
    >
      <ol className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm">
        <li className="min-w-0 shrink-0">
          {isRoot ? (
            <span className="text-foreground font-medium">Admin</span>
          ) : (
            <Link
              className="hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 rounded-sm outline-none focus-visible:ring-[3px]"
              href="/admin"
            >
              Admin
            </Link>
          )}
        </li>
        {!isRoot ? (
          <>
            <li aria-hidden="true" className="shrink-0">
              /
            </li>
            <li className="text-foreground min-w-0 truncate font-medium">
              {currentItem.label}
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}

function AdminHeaderCommandSearch(props: { pathname: string }) {
  const [query, setQuery] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const currentItem =
    getAdminNavigationItemForPathname(props.pathname) ??
    adminNavigationFallbackItem;
  const normalizedQuery = normalizeSearchValue(query);
  const results = React.useMemo(() => {
    if (!normalizedQuery) {
      return adminNavigationItems.filter(
        (item) => item.href !== props.pathname,
      );
    }

    return adminNavigationItems.filter((item) => {
      const searchableText = normalizeSearchValue(
        `${item.label} ${item.description}`,
      );

      return searchableText.includes(normalizedQuery);
    });
  }, [normalizedQuery, props.pathname]);
  const visibleResults = results.slice(0, 5);
  const showResults =
    isFocused && (query.length > 0 || visibleResults.length > 0);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstResult = visibleResults[0];

    if (firstResult) {
      window.location.assign(firstResult.href);
    }
  };

  return (
    <div className="relative min-w-0 sm:w-80">
      <form
        action="/admin"
        className="relative"
        onSubmit={handleSubmit}
        role="search"
      >
        <label className="sr-only" htmlFor="admin-command-search">
          Buscar sección admin
        </label>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        >
          <SearchGlyph />
        </span>
        <Input
          autoComplete="off"
          className="h-9 min-w-0 pl-9"
          id="admin-command-search"
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={`Buscar desde ${currentItem.label}`}
          type="search"
          value={query}
        />
      </form>
      {showResults ? (
        <div className="border-border bg-popover text-popover-foreground absolute right-0 left-0 z-30 mt-2 max-h-72 overflow-y-auto rounded-md border p-1 shadow-md">
          {visibleResults.length > 0 ? (
            visibleResults.map((item) => (
              <Link
                className="hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground block rounded-sm px-3 py-2 text-sm outline-none"
                href={item.href}
                key={item.href}
              >
                <span className="block font-medium">{item.label}</span>
                <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                  {item.description}
                </span>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground px-3 py-2 text-sm">
              Sin secciones coincidentes
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
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

function MenuGlyph() {
  return (
    <span
      aria-hidden="true"
      className="flex size-4 flex-col justify-center gap-1"
    >
      <span className="h-0.5 w-4 rounded-full bg-current" />
      <span className="h-0.5 w-4 rounded-full bg-current" />
      <span className="h-0.5 w-4 rounded-full bg-current" />
    </span>
  );
}

function CloseGlyph() {
  return (
    <span aria-hidden="true" className="relative size-4">
      <span className="absolute top-1/2 left-0 h-0.5 w-4 rotate-45 rounded-full bg-current" />
      <span className="absolute top-1/2 left-0 h-0.5 w-4 -rotate-45 rounded-full bg-current" />
    </span>
  );
}

function CollapseGlyph(props: { collapsed: boolean }) {
  return (
    <span aria-hidden="true" className="text-base leading-none">
      {props.collapsed ? ">" : "<"}
    </span>
  );
}

function SearchGlyph() {
  return (
    <span aria-hidden="true" className="relative block size-4">
      <span className="border-muted-foreground absolute top-0 left-0 size-3 rounded-full border-2" />
      <span className="bg-muted-foreground absolute right-0 bottom-0 h-2 w-0.5 rotate-[-45deg] rounded-full" />
    </span>
  );
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-BO");
}
