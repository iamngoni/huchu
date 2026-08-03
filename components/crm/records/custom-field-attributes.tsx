"use client";

import { formatFieldValue, type FieldDefinition } from "@/lib/crm/custom-fields";
import type { CrmFieldDefinitionRecord } from "@/lib/crm/crm-v2";

import type { RecordAttribute } from "./record-attributes";

/**
 * An administrator's custom fields, as editable properties.
 *
 * They were drawn in a boxed panel below the tabs, read-only, on four of the
 * five record types — leads had none at all. So a field somebody added to
 * capture "roof type" could be filled in on the create form and never
 * corrected afterwards, and on a lead not captured at all.
 *
 * They are properties like any other now: they join the record's attribute
 * list, in the order and sections the administrator arranged, and write
 * through the same PATCH. Anything with a fixed set of answers or a shape a
 * text box would mangle keeps its formatted read-only rendering until it has
 * a real editor — a date picker in a property row is its own piece of work,
 * and a text box that accepts "next tuesday" into a date column is worse than
 * no editor.
 */

/** Types a text box can safely round-trip. */
const TEXT_EDITABLE = new Set(["TEXT", "TEXTAREA", "URL", "EMAIL", "PHONE"]);
const NUMBER_EDITABLE = new Set(["NUMBER", "CURRENCY", "PERCENT"]);

export function customFieldAttributes({
  definitions,
  values,
  onCommit,
}: {
  definitions: CrmFieldDefinitionRecord[];
  values: Record<string, unknown> | null;
  /** Writes one custom field. The caller owns the PATCH and its cache. */
  onCommit: (key: string, value: unknown) => void;
}): RecordAttribute[] {
  return [...definitions]
    .filter((definition) => !definition.archivedAt)
    .sort((a, b) => a.position - b.position)
    .map((definition) => {
      const raw = values?.[definition.key] ?? null;
      const label = definition.section
        ? `${definition.section} · ${definition.label}`
        : definition.label;

      if (TEXT_EDITABLE.has(definition.type)) {
        return {
          id: `cf-${definition.key}`,
          label,
          placeholder: "Empty",
          value: raw == null ? null : String(raw),
          onCommit: (next: string) => onCommit(definition.key, next.trim() || null),
        };
      }

      if (NUMBER_EDITABLE.has(definition.type)) {
        return {
          id: `cf-${definition.key}`,
          label,
          mono: true,
          placeholder: "Empty",
          value: raw == null ? null : String(raw),
          onCommit: (next: string) => {
            const trimmed = next.trim();
            if (trimmed === "") return onCommit(definition.key, null);
            const parsed = Number(trimmed);
            if (Number.isFinite(parsed)) onCommit(definition.key, parsed);
          },
        };
      }

      // Selects, dates, booleans: shown as the administrator defined them,
      // formatted, until each has an editor that cannot corrupt the value.
      return {
        id: `cf-${definition.key}`,
        label,
        value: formatFieldValue(definition as unknown as FieldDefinition, raw),
        placeholder: "Empty",
      };
    });
}
