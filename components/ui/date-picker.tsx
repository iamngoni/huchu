"use client";

import * as React from "react";
import { format, setHours, setMinutes } from "date-fns";
import { CalendarIcon, ChevronDown, Clock3 } from "@/lib/icons";
import { type DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * DatePicker — Radix Popover + the local Calendar, in design-system chrome.
 *
 * The DS has no date picker; `.daterange` styles a *trigger* and nothing else.
 * The `DatePickerProps` union over `mode: "single" | "range" | "date-time"` is
 * what makes `onChange` correctly typed as `(v?: Date)` vs `(v?: DateRange)` at
 * each call site, so it stays a discriminated union rather than being flattened.
 * `onChange(undefined)` is a real signal here — it is what the Clear button
 * emits.
 *
 * The panel carries `.popover` for its header/footer descendant rules
 * (`.pop-h`, `.ti`, `.pop-actions`); the surface `.popover` would otherwise
 * draw is switched off, because `PopoverContent` already draws it and
 * `.popover`'s 320px max-width would crush the two-month range grid.
 */
export type DatePickerMode = "single" | "range" | "date-time";

type CommonProps = {
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  align?: React.ComponentProps<typeof PopoverContent>["align"];
  sideOffset?: number;
  label?: string;
};

type SingleDatePickerProps = CommonProps & {
  mode?: "single";
  value?: Date;
  onChange: (value?: Date) => void;
};

type RangeDatePickerProps = CommonProps & {
  mode: "range";
  value?: DateRange;
  onChange: (value?: DateRange) => void;
};

type DateTimePickerProps = CommonProps & {
  mode: "date-time";
  value?: Date;
  onChange: (value?: Date) => void;
};

export type DatePickerProps = SingleDatePickerProps | RangeDatePickerProps | DateTimePickerProps;

function isRangePickerProps(props: DatePickerProps): props is RangeDatePickerProps {
  return props.mode === "range";
}

function isDateTimePickerProps(props: DatePickerProps): props is DateTimePickerProps {
  return props.mode === "date-time";
}

function formatTimeValue(value?: Date) {
  if (!value) return "09:00";
  return format(value, "HH:mm");
}

function combineDateAndTime(date: Date, timeValue: string) {
  const [hours, minutes] = timeValue.split(":").map((part) => Number(part));
  const withHours = setHours(date, Number.isFinite(hours) ? hours : 9);
  return setMinutes(withHours, Number.isFinite(minutes) ? minutes : 0);
}

function buildTimeOptions(limit: number) {
  return Array.from({ length: limit }, (_, index) => String(index).padStart(2, "0"));
}

function formatSingleDate(value?: Date) {
  return value ? format(value, "MMM d, yyyy") : "Select date";
}

function formatDateTime(value?: Date) {
  return value ? format(value, "MMM d, yyyy h:mm a") : "Select date and time";
}

function formatRange(value?: DateRange) {
  if (!value?.from && !value?.to) return "Select range";
  if (value.from && !value.to) return `${format(value.from, "MMM d, yyyy")} - ...`;
  if (!value.from || !value.to) return "Select range";
  return `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`;
}

function DatePickerTrigger({
  className,
  value,
  placeholder,
  ...props
}: React.ComponentProps<typeof Button> & {
  value: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-9 w-full min-w-[220px] justify-between rounded-[var(--button-radius)] bg-[var(--surface)] px-3 text-left text-[var(--text-strong)] shadow-none [font:var(--type-label-sm)]",
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-[var(--text-muted)]" />
        <span className="truncate">{value ?? placeholder ?? "Select date"}</span>
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
    </Button>
  );
}

export function DatePicker(props: DatePickerProps) {
  const {
    className,
    triggerClassName,
    contentClassName,
    placeholder,
    disabled,
    align = "start",
    sideOffset = 8,
    label,
  } = props;

  const mode = props.mode ?? "single";
  const isRange = isRangePickerProps(props);
  const isDateTime = isDateTimePickerProps(props);
  const rangeValue = isRange ? props.value : undefined;
  const dateTimeValue = isDateTime ? props.value : undefined;
  const singleValue = !isRange && !isDateTime ? props.value : undefined;
  const hourOptions = React.useMemo(() => buildTimeOptions(24), []);
  const minuteOptions = React.useMemo(() => buildTimeOptions(60), []);
  const [open, setOpen] = React.useState(false);
  const [pendingDate, setPendingDate] = React.useState<Date | undefined>(
    isDateTime ? dateTimeValue : isRange ? rangeValue?.from : singleValue,
  );
  const [timeValue, setTimeValue] = React.useState(() => formatTimeValue(dateTimeValue));

  React.useEffect(() => {
    if (isDateTime) {
      setPendingDate(dateTimeValue);
      setTimeValue(formatTimeValue(dateTimeValue));
      return;
    }

    if (isRange) {
      setPendingDate(rangeValue?.from);
      return;
    }

    setPendingDate(singleValue);
  }, [dateTimeValue, isDateTime, isRange, rangeValue?.from, singleValue]);

  const timeParts = React.useMemo(() => {
    const [hours = "09", minutes = "00"] = timeValue.split(":");
    return { hours, minutes };
  }, [timeValue]);

  const triggerValue = React.useMemo(() => {
    if (isRange) return formatRange(rangeValue);
    if (isDateTime) return formatDateTime(dateTimeValue);
    return formatSingleDate(singleValue);
  }, [dateTimeValue, isDateTime, isRange, rangeValue, singleValue]);

  const closeIfReady = () => {
    if (mode === "single") setOpen(false);
    if (isRange && rangeValue?.from && rangeValue?.to) setOpen(false);
  };

  const handleClear = () => {
    if (mode === "range") {
      props.onChange(undefined);
    } else {
      props.onChange(undefined);
    }
    setPendingDate(undefined);
    setTimeValue("09:00");
  };

  const handleApplyDateTime = () => {
    if (!isDateTime || !pendingDate) return;
    props.onChange(combineDateAndTime(pendingDate, timeValue));
    setOpen(false);
  };

  const updateTimePart = (part: "hours" | "minutes", value: string) => {
    const nextValue =
      part === "hours"
        ? `${value}:${timeParts.minutes}`
        : `${timeParts.hours}:${value}`;
    setTimeValue(nextValue);
  };

  const calendar = isRange ? (
    <Calendar
      mode="range"
      selected={rangeValue}
      onSelect={(nextRange) => {
        props.onChange(nextRange);
        if (nextRange?.from && nextRange?.to) {
          setOpen(false);
        }
      }}
      numberOfMonths={2}
      className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] shadow-none"
    />
  ) : (
    <Calendar
      mode="single"
      selected={pendingDate}
      onSelect={(nextDate) => {
        if (isDateTime) {
          setPendingDate(nextDate);
          if (nextDate && timeValue === "09:00") {
            setTimeValue(formatTimeValue(nextDate));
          }
          return;
        }

        props.onChange(nextDate);
        if (nextDate) {
          setOpen(false);
        }
      }}
      numberOfMonths={1}
      className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] shadow-none"
    />
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? <Label>{label}</Label> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <DatePickerTrigger
            className={triggerClassName}
            value={triggerValue}
            placeholder={placeholder}
          />
        </PopoverTrigger>
        <PopoverContent
          align={align}
          sideOffset={sideOffset}
          className={cn("w-auto p-0", contentClassName)}
        >
          {/* `.popover` scopes `.pop-h` / `.ti` / `.pop-actions`; its own
              surface and 320px cap are cleared — PopoverContent already draws
              the surface, and the range mode renders two months side by side. */}
          <div className="popover max-w-none overflow-hidden rounded-[var(--card-radius)] border-0 p-0 shadow-none">
            <div className="pop-h mb-0 items-start gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <p className="ti">
                  {mode === "range" ? "Select date range" : mode === "date-time" ? "Select date and time" : "Select date"}
                </p>
                <p className="text-[var(--text-muted)] [font:var(--type-caption)]">
                  {mode === "range"
                    ? "Choose a start and end date."
                    : mode === "date-time"
                      ? "Pick a day, then set the time."
                      : "Choose a single calendar date."}
                </p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={handleClear}>
                Clear
              </Button>
            </div>

            <div className="px-2 pt-2">{calendar}</div>

            {mode === "date-time" ? (
              <>
                <Separator />
                <div className="space-y-3 px-4 py-4">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px]">
                    <div className="grid gap-2 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 sm:grid-cols-2">
                      <p className="mb-1 flex items-center gap-2 tracking-[0.16em] text-[var(--text-muted)] uppercase [font:var(--type-eyebrow)] sm:col-span-2">
                        <Clock3 className="h-3.5 w-3.5" />
                        Time
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                        <Select value={timeParts.hours} onValueChange={(value) => updateTimePart("hours", value)}>
                          <SelectTrigger className="w-full shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {hourOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={timeParts.minutes} onValueChange={(value) => updateTimePart("minutes", value)}>
                          <SelectTrigger className="w-full shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {minuteOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
                      <p className="tracking-[0.16em] text-[var(--text-muted)] uppercase [font:var(--type-eyebrow)]">Preview</p>
                      <p className="mt-2 text-[var(--text-strong)] [font:var(--type-mono)]">
                        {pendingDate ? formatDateTime(combineDateAndTime(pendingDate, timeValue)) : "Pick a date"}
                      </p>
                    </div>
                  </div>
                  <div className="pop-actions items-center">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={handleApplyDateTime} disabled={!pendingDate}>
                      Apply
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="pop-actions mt-0 items-center border-t border-[var(--border)] px-4 py-3">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
                <Button type="button" onClick={closeIfReady} disabled={isRange && !rangeValue?.to}>
                  Done
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DateRangePicker(
  props: Omit<RangeDatePickerProps, "mode">,
) {
  return <DatePicker mode="range" {...props} />;
}

export function DateTimePicker(
  props: Omit<DateTimePickerProps, "mode">,
) {
  return <DatePicker mode="date-time" {...props} />;
}
