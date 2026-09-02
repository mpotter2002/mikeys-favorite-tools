export type Theme = "light" | "dark";

export const THEME_KEY = "toolfolio.theme.v1";

export function readTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function setFavicon(theme: Theme) {
  let icon = document.querySelector<HTMLLinkElement>("#theme-favicon");
  if (!icon) {
    icon = document.createElement("link");
    icon.id = "theme-favicon";
    icon.rel = "icon";
    document.head.appendChild(icon);
  }
  icon.href = `/branding/favicon-${theme}.png`;
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_KEY, theme);
  setFavicon(theme);
  window.dispatchEvent(new CustomEvent<Theme>("toolfolio-theme", { detail: theme }));
}
