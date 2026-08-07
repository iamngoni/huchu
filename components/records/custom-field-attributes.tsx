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

/**
 * Types a text box can safely round-trip.
 *
 * These are `CrmFieldType` values — checked against `CRM_FIELD_TYPES` by the
 * test beside this file, because they were not. This set previously named
 * "TEXT" and "TEXTAREA", which the enum has never had: the values are
 * SHORT_TEXT and LONG_TEXT. Both therefore fell through to the read-only
 * branch, so the two commonest custom-field types were the two nobody could
 * edit from a property row, while URL, EMAIL and PHONE worked. Nothing failed —
 * a Set lookup on a string that is not in it is just `false`.
 */
export const TEXT_EDITABLE = new Set(["SHORT_TEXT", "LONG_TEXT", "URL", "EMAIL", "PHONE"]);
export const NUMBER_EDITABLE = new Set(["NUMBER", "CURRENCY", "PERCENT"]);

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
