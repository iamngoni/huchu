"use client";

import * as React from "react";

/**
 * Light or dark, chosen rather than inherited.
 *
 * The design system already knows how to be dark — `body.is-dark` remaps every
 * token — but nothing ever put the class on, so the only way to get there was
 * to change your operating system. That is the wrong granularity: people work
 * in a light OS and a dark editor, or the other way round, and an app that
 * cannot be told which it is has decided for them.
 *
 * Three states, not two. "System" has to stay distinct from an explicit light,
 * or somebody who never chose is frozen at whatever their laptop was set to
 * the first time they loaded the page.
 */
export const THEME_CHOICES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

const STORAGE_KEY = "huchu.theme";
const DARK_CLASS = "is-dark";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function readChoice(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return (THEME_CHOICES as readonly string[]).includes(raw ?? "")
      ? (raw as ThemeChoice)
      : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const dark = choice === "dark" || (choice === "system" && systemPrefersDark());
  document.body.classList.toggle(DARK_CLASS, dark);
}

export function useTheme(): {
  choice: ThemeChoice;
  isDark: boolean;
  setChoice: (next: ThemeChoice) => void;
  toggle: () => void;
} {
  const [choice, setStoredChoice] = React.useState<ThemeChoice>("system");
  const [systemDark, setSystemDark] = React.useState(false);

  // Read after mount rather than during, so the server and the first client
  // render agree and hydration does not warn about a body that changed class.
  React.useEffect(() => {
    setStoredChoice(readChoice());
    setSystemDark(systemPrefersDark());

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const isDark = choice === "dark" || (choice === "system" && systemDark);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle(DARK_CLASS, isDark);
  }, [isDark]);

  const setChoice = React.useCallback((next: ThemeChoice) => {
    setStoredChoice(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing: the theme still applies, it just forgets.
    }
  }, []);

  // Toggling from "system" lands on the opposite of what you are looking at,
  // which is the only reading of "toggle" that does something visible.
  const toggle = React.useCallback(
    () => setChoice(isDark ? "light" : "dark"),
    [isDark, setChoice],
  );

  return { choice, isDark, setChoice, toggle };
}
