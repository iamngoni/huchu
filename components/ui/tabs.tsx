"use client";

import * as React from "react";
import {
  Tabs as DsTabs,
  TabsContent as DsTabsContent,
  TabsList as DsTabsList,
  TabsTrigger as DsTabsTrigger,
} from "@corelithzw/react";

import { cn } from "@/lib/utils";

/**
 * Tabs — the design system's, behind this repo's Radix-shaped API.
 *
 * The DS primitive now ships real CSS for the four tab variants, so the long
 * inline `bg-[var(--surface-muted)] … data-[state=active]:shadow-…` recipe the
 * local copy carried is gone; `.stabs` / `.stab` say exactly the same thing.
 *
 * Deviations from a bare re-export, all deliberate:
 *
 *   - `variant` defaults to `segmented`, not the DS's `underline`. The four
 *     call sites here were all styled as a pill strip on a muted track, which
 *     is `.stabs`; defaulting to `underline` would silently restyle them.
 *   - `TabsContent` keeps its hard-coded `mt-4`. Two call sites already pass
 *     `mt-0` to opt out and rely on `cn()`'s tailwind-merge to win.
 *   - `TabsList` keeps the horizontal-overflow escape hatch. One call site
 *     renders eight triggers and the DS `.stabs` does not scroll on its own.
 *   - `TabsContent` keeps its focus ring: the DS panel is `tabIndex={0}` but
 *     draws no ring of its own.
 *
 * The DS trigger emits `data-state="active" | "inactive"` exactly as Radix did,
 * so any `data-[state=active]:` utilities at call sites keep matching. `asChild`
 * survives on the trigger. Radix's `dir` prop is not carried over — nothing
 * here used it.
 *
 * New code should import `Tabs` from `@corelithzw/react`.
 */
export type TabsProps = React.ComponentProps<typeof DsTabs>;

function Tabs({ variant = "segmented", ...props }: TabsProps) {
  return <DsTabs variant={variant} {...props} />;
}
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  React.ElementRef<typeof DsTabsList>,
  React.ComponentPropsWithoutRef<typeof DsTabsList>
>(({ className, ...props }, ref) => (
  <DsTabsList
    ref={ref}
    data-slot="tabs-list"
    className={cn(
      "max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof DsTabsTrigger>,
  React.ComponentPropsWithoutRef<typeof DsTabsTrigger>
>(({ className, ...props }, ref) => (
  <DsTabsTrigger
    ref={ref}
    data-slot="tabs-trigger"
    className={cn(className)}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  React.ElementRef<typeof DsTabsContent>,
  React.ComponentPropsWithoutRef<typeof DsTabsContent>
>(({ className, ...props }, ref) => (
  <DsTabsContent
    ref={ref}
    data-slot="tabs-content"
    className={cn(
      "mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--focus-ring-offset)]",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
