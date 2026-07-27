"use client";

/**
 * Sidebar — the design system's, re-exported under the same names.
 *
 * The whole set now lives in `@corelithzw/react` (`src/shells/Sidebar.tsx`):
 * the provider that owns open/collapsed state and publishes `--sidebar-width*`,
 * the `<aside>` that becomes a `Drawer` on mobile, and every row primitive. The
 * markup contract is identical to what this file used to emit — same
 * `data-sidebar="…"` attributes, same `data-state` / `data-collapsible` /
 * `data-variant`, same `data-active` / `data-collapsed` on rows — so the 7
 * files importing from here (`SidebarGroup` and `SidebarGroupContent` 24× each,
 * `useSidebar` 16×) need no changes. The Tailwind utility strings this file
 * carried are now `.sidebar-*` rules in the DS's `nav.css`.
 *
 * `useSidebar` still throws outside a `SidebarProvider` — verified in the DS
 * source, so the "must be used within a SidebarProvider" guard is unchanged.
 *
 * Three things are deliberately different, none of them a prop:
 *   - `SidebarSeparator` is a DS `<div role="separator">` rather than a wrapped
 *     Radix `Separator`. Nothing here passed Radix-only props to it.
 *   - `SidebarInput` is the DS `Input` at `size="sm"` rather than this repo's
 *     `Input`. Same element, same forwarded props.
 *   - `SidebarTrigger`'s default glyph is the DS's own inline panel icon rather
 *     than the Phosphor `SidebarSimple` from `@/lib/icons`. Pass `children` to
 *     override it. The accessible name ("Toggle sidebar") is unchanged.
 *
 * New code should import these from `@corelithzw/react` directly.
 */
export {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarInput,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  useSidebar,
} from "@corelithzw/react";

export type {
  SidebarProps,
  SidebarProviderProps,
  SidebarMenuButtonProps,
  SidebarContextValue,
} from "@corelithzw/react";
