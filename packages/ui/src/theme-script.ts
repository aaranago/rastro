export const themeModes = ["light", "dark", "auto"] as const;

export type ThemeMode = (typeof themeModes)[number];
export type ResolvedTheme = Exclude<ThemeMode, "auto">;

export const themeKey = "theme-mode";

export const themeDetectorScript = (function () {
  function themeFn() {
    const isValidTheme = (theme: string) => {
      const validThemes = ["light", "dark", "auto"] as const;
      return validThemes.includes(theme as (typeof validThemes)[number]);
    };

    const storedTheme = localStorage.getItem("theme-mode") ?? "auto";
    const validTheme = isValidTheme(storedTheme) ? storedTheme : "auto";

    if (validTheme === "auto") {
      const autoTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      document.documentElement.classList.add(autoTheme, "auto");
    } else {
      document.documentElement.classList.add(validTheme);
    }
  }
  return `(${themeFn.toString()})();`;
})();
