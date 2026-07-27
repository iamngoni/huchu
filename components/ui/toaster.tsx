"use client";

import { Toaster as DsToaster } from "@corelithzw/react";

/**
 * Toaster — the design system's host, mounted once in `app-providers.tsx`.
 *
 * The DS renders the stack itself from its own store, so the local
 * `toasts.map(...)` loop is gone. `position` and `max` are passed to preserve
 * this repo's placement (top-right) and limit (4); the DS defaults are
 * bottom-right and 5.
 */
export function Toaster() {
  return <DsToaster position="top-right" max={4} />;
}
