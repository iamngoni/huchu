/**
 * CRM import.
 *
 * The shape of this is deliberately two-step: work out what would happen, show
 * it, then do it. An import that writes first and reports afterwards leaves
 * somebody reconciling four thousand rows by hand.
 */
import { z } from "zod";

import { parseCsv, rowToRecord, type CsvTable } from "./csv";

export const IMPORT_ENTITIES = ["PERSON", "COMPANY", "LEAD"] as const;
export type ImportEntity = (typeof IMPORT_ENTITIES)[number];

export type ImportField = {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];
};

export const IMPORT_FIELDS: Record<ImportEntity, ImportField[]> = {
  PERSON: [
    { key: "firstName", label: "First name", required: true, aliases: ["first", "givenname"] },
    { key: "lastName", label: "Last name", aliases: ["last", "surname", "familyname"] },
    { key: "email", label: "Email", aliases: ["emailaddress", "mail"] },
    { key: "phone", label: "Phone", aliases: ["mobile", "cell", "telephone", "phonenumber"] },
    { key: "jobTitle", label: "Job title", aliases: ["title", "position", "role"] },
    { key: "companyName", label: "Company", aliases: ["organisation", "organization", "employer"] },
    { key: "city", label: "City", aliases: ["town"] },
    { key: "country", label: "Country" },
    { key: "notes", label: "Notes", aliases: ["comments"] },
    { key: "tags", label: "Tags", aliases: ["labels"] },
  ],
  COMPANY: [
    { key: "name", label: "Name", required: true, aliases: ["companyname", "organisation", "organization"] },
    { key: "tradingName", label: "Trading name", aliases: ["tradingas", "dba"] },
    { key: "contactName", label: "Contact name", aliases: ["contact"] },
    { key: "email", label: "Email", aliases: ["emailaddress"] },
    { key: "phone", label: "Phone", aliases: ["telephone", "mobile"] },
    { key: "website", label: "Website", aliases: ["url", "site"] },
    { key: "registrationNumber", label: "Registration number", aliases: ["regno", "companyno"] },
    { key: "taxNumber", label: "Tax number", aliases: ["vat", "vatnumber", "tin"] },
    { key: "industry", label: "Industry", aliases: ["sector"] },
    { key: "city", label: "City", aliases: ["town"] },
    { key: "country", label: "Country" },
    { key: "tags", label: "Tags" },
  ],
  LEAD: [
    { key: "title", label: "Title", required: true, aliases: ["subject", "opportunity", "dealname"] },
    { key: "contactName", label: "Contact name", aliases: ["contact", "name"] },
    { key: "contactEmail", label: "Email", aliases: ["email", "emailaddress"] },
    { key: "contactPhone", label: "Phone", aliases: ["phone", "mobile", "telephone"] },
    { key: "companyName", label: "Company", aliases: ["organisation", "organization", "client"] },
    { key: "estimatedValue", label: "Value", aliases: ["amount", "dealvalue", "budget"] },
    { key: "currency", label: "Currency" },
    { key: "source", label: "Source", aliases: ["leadsource", "origin"] },
    { key: "services", label: "Services", aliases: ["products", "interestedin"] },
  ],
};

export type ImportRowIssue = { field: string; message: string };

export type ImportRowPlan = {
  /** 1-based row number in the file, counting the header as row 1. */
  line: number;
  action: "CREATE" | "UPDATE" | "SKIP";
  values: Record<string, string>;
  /** The existing record this row matched, when it did. */
  matchId?: string;
  matchLabel?: string;
  issues: ImportRowIssue[];
};

export type ImportPlan = {
  entity: ImportEntity;
  totals: { create: number; update: number; skip: number };
  rows: ImportRowPlan[];
  /** Columns in the file that no field claimed, so nothing is lost silently. */
  unmappedHeaders: string[];
};

export const importMappingSchema = z.object({
  entity: z.enum(IMPORT_ENTITIES),
  mapping: z.record(z.string(), z.string()),
  /** What to do when a row matches an existing record. */
  onDuplicate: z.enum(["SKIP", "UPDATE"]).default("SKIP"),
});
export type ImportMapping = z.infer<typeof importMappingSchema>;

/** Numbers in exports arrive as "1,250.00", "$1250" or "1 250". */
export function parseImportNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Tags and services arrive semicolon- or comma-separated inside one cell. */
export function parseImportList(raw: string): string[] {
  return raw
    .split(/[;,|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRow(entity: ImportEntity, values: Record<string, string>): ImportRowIssue[] {
  const issues: ImportRowIssue[] = [];

  for (const field of IMPORT_FIELDS[entity]) {
    if (field.required && !values[field.key]) {
      issues.push({ field: field.key, message: `${field.label} is required` });
    }
  }

  const email = values.email ?? values.contactEmail;
  if (email && !EMAIL_PATTERN.test(email)) {
    issues.push({ field: "email", message: `"${email}" doesn't look like an email address` });
  }

  if (values.estimatedValue && parseImportNumber(values.estimatedValue) === null) {
    issues.push({
      field: "estimatedValue",
      message: `"${values.estimatedValue}" isn't a number`,
    });
  }

  return issues;
}

/** A key two rows can share, used to spot duplicates inside the file itself. */
export function importRowKey(entity: ImportEntity, values: Record<string, string>): string | null {
  const email = (values.email ?? values.contactEmail ?? "").toLowerCase().trim();
  if (email) return `email:${email}`;
  if (entity === "COMPANY" && values.name) return `name:${values.name.toLowerCase().trim()}`;
  const phone = (values.phone ?? values.contactPhone ?? "").replace(/\D/g, "");
  if (phone) return `phone:${phone}`;
  return null;
}

/**
 * Build the plan.
 *
 * `findMatch` is passed in rather than queried here so this stays pure and the
 * caller decides how hard to look for an existing record.
 */
export function buildImportPlan(
  table: CsvTable,
  config: ImportMapping,
  findMatch: (values: Record<string, string>) => { id: string; label: string } | null = () => null,
): ImportPlan {
  const rows: ImportRowPlan[] = [];
  const seen = new Map<string, number>();
  const mappedHeaders = new Set(Object.values(config.mapping).filter(Boolean));

  table.rows.forEach((cells, index) => {
    const line = index + 2; // header is line 1
    const values = rowToRecord(table.headers, cells, config.mapping);

    // A row where every mapped cell was blank is padding at the end of a
    // spreadsheet, not a record somebody meant to import.
    if (Object.keys(values).length === 0) return;

    const issues = validateRow(config.entity, values);

    const key = importRowKey(config.entity, values);
    if (key) {
      const firstLine = seen.get(key);
      if (firstLine) {
        issues.push({
          field: "_row",
          message: `Same contact as row ${firstLine} in this file`,
        });
      } else {
        seen.set(key, line);
      }
    }

    const match = issues.length === 0 ? findMatch(values) : null;

    let action: ImportRowPlan["action"];
    if (issues.length > 0) action = "SKIP";
    else if (match) action = config.onDuplicate === "UPDATE" ? "UPDATE" : "SKIP";
    else action = "CREATE";

    rows.push({
      line,
      action,
      values,
      matchId: match?.id,
      matchLabel: match?.label,
      issues,
    });
  });

  return {
    entity: config.entity,
    totals: {
      create: rows.filter((row) => row.action === "CREATE").length,
      update: rows.filter((row) => row.action === "UPDATE").length,
      skip: rows.filter((row) => row.action === "SKIP").length,
    },
    rows,
    unmappedHeaders: table.headers.filter((header) => !mappedHeaders.has(header)),
  };
}

export function parseImportFile(text: string): CsvTable {
  return parseCsv(text);
}

/** Imports are capped so one paste can't lock the table for everyone else. */
export const MAX_IMPORT_ROWS = 5000;
