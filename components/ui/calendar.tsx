"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/lib/icons"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

/**
 * Calendar — react-day-picker, dressed in design-system tokens.
 *
 * The DS ships no calendar surface at all (`dist/styles.css` has `.daterange`
 * for the *trigger*, nothing for a month grid), and react-day-picker owns the
 * grid, the range modifiers, the keyboard model and the `mode` union that
 * `date-picker.tsx` depends on. So the engine stays and the existing
 * `classNames` map is simply retargeted: every colour, border, radius and shadow
 * now resolves to a package token rather than a bridge alias or a literal.
 *
 * Two values have no DS token and are kept as literals: the `--cell-size` grid
 * unit, and the 10px day-button sub-label. Both are noted inline.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "outline",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar rounded-[var(--card-radius)] bg-transparent p-0 text-[var(--text-body)] [--cell-size:2.375rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-8 rounded-[var(--radius-lg)] border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text-body)] shadow-none select-none aria-disabled:opacity-50 hover:bg-[var(--surface-muted)]",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-8 rounded-[var(--radius-lg)] border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text-body)] shadow-none select-none aria-disabled:opacity-50 hover:bg-[var(--surface-muted)]",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-8 w-full items-center justify-center px-10",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-8 w-full items-center justify-center gap-1.5 [font:var(--type-label-sm)]",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] has-focus:border-[var(--focus-ring)] has-focus:ring-[3px] has-focus:ring-[var(--focus-ring-soft)] has-focus:ring-offset-0",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 bg-[var(--surface)] opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "text-[var(--text-strong)] select-none",
          captionLayout === "label"
            ? "[font:var(--type-label-sm)]"
            : "flex h-8 items-center gap-1 rounded-[var(--radius-lg)] pl-2 pr-1 [font:var(--type-label-sm)] [&>svg]:size-3.5 [&>svg]:text-[var(--text-muted)]",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("mb-1 flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-[var(--radius-sm)] tracking-[0.08em] text-[var(--text-muted)] uppercase select-none [font:var(--type-eyebrow)]",
          defaultClassNames.weekday
        ),
        week: cn("mt-1.5 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[var(--text-muted)] select-none [font:var(--type-caption)]",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:last-child[data-selected=true]_button]:rounded-r-[var(--radius-lg)]",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-[var(--radius-lg)]"
            : "[&:first-child[data-selected=true]_button]:rounded-l-[var(--radius-lg)]",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-[var(--radius-lg)] bg-[var(--tone-info-bg)]",
          defaultClassNames.range_start
        ),
        range_middle: cn(
          "rounded-none bg-[color-mix(in_srgb,var(--tone-info-bg)_72%,var(--surface))]",
          defaultClassNames.range_middle
        ),
        range_end: cn(
          "rounded-r-[var(--radius-lg)] bg-[var(--tone-info-bg)]",
          defaultClassNames.range_end
        ),
        today: cn("text-[var(--text-strong)]", defaultClassNames.today),
        outside: cn(
          "text-[var(--text-subtle)] aria-selected:text-[var(--text-subtle)]",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-[var(--text-subtle)] opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[var(--cell-size)] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "flex size-auto w-full min-w-[var(--cell-size)] flex-col gap-1 rounded-[var(--radius-lg)] border border-transparent leading-none font-medium text-[var(--text-body)] shadow-none transition-colors hover:bg-[var(--surface-muted)]",
        "data-[selected-single=true]:border-[var(--action-primary-bg)] data-[selected-single=true]:bg-[var(--action-primary-bg)] data-[selected-single=true]:text-[var(--action-primary-fg)]",
        "data-[range-middle=true]:bg-[color-mix(in_srgb,var(--tone-info-bg)_72%,var(--surface))] data-[range-middle=true]:text-[var(--text-strong)]",
        "data-[range-start=true]:border-[var(--action-primary-bg)] data-[range-start=true]:bg-[var(--action-primary-bg)] data-[range-start=true]:text-[var(--action-primary-fg)]",
        "data-[range-end=true]:border-[var(--action-primary-bg)] data-[range-end=true]:bg-[var(--action-primary-bg)] data-[range-end=true]:text-[var(--action-primary-fg)]",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-[var(--focus-ring-soft)]",
        "data-[range-end=true]:rounded-[var(--radius-lg)] data-[range-end=true]:rounded-r-[var(--radius-lg)] data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-[var(--radius-lg)] data-[range-start=true]:rounded-l-[var(--radius-lg)]",
        "data-[today=true]:border-[var(--border)] data-[today=true]:bg-[var(--surface-muted)]",
        // No DS token sits below --type-caption (12px); the day sub-label needs
        // to stay smaller than the numeral it hangs off.
        "[&>span]:text-[10px] [&>span]:font-medium [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
