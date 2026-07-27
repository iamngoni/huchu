import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The container every CRM page sits in.
 *
 * Page widths had drifted to six different values across the module —
 * `max-w-4xl` through `max-w-[110rem]` — so moving between pages shifted the
 * content under you. Three widths, named for what they hold, and one place to
 * change them:
 *
 *   list    the default: a record list or a dashboard
 *   detail  a record page carrying a side rail, so it needs the room
 *   narrow  a single column of form — an import wizard, a form builder
 */
const WIDTH = {
  list: "max-w-7xl",
  detail: "max-w-[100rem]",
  narrow: "max-w-3xl",
} as const;

export function CrmPage({
  width = "list",
  className,
  children,
}: {
  width?: keyof typeof WIDTH;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full space-y-6", WIDTH[width], className)}>{children}</div>
  );
}
