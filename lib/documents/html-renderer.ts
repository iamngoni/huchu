import type { DocumentTemplateSchema } from "@/lib/documents/template-schema";
import type {
  CompanyBrandingSnapshot,
  DocumentBadgeTone,
  UniversalDocumentPayload,
} from "@/lib/documents/types";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BADGE_TONES: Record<DocumentBadgeTone, { bg: string; fg: string; border: string }> = {
  positive: { bg: "#ecfdf5", fg: "#047857", border: "#a7f3d0" },
  warning: { bg: "#fffbeb", fg: "#b45309", border: "#fde68a" },
  negative: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" },
  neutral: { bg: "#f4f4f5", fg: "#3f3f46", border: "#e4e4e7" },
};

function buildTable(payload: UniversalDocumentPayload, schema: DocumentTemplateSchema): string {
  const list = payload.list;
  const lineRows = payload.record?.lines;
  const sourceRows = list?.rows ?? lineRows ?? [];
  if (!sourceRows || sourceRows.length === 0) return "";

  const keys =
    list?.columns?.map((column) => column.key) ??
    payload.record?.lineColumns?.map((column) => column.key) ??
    Object.keys(sourceRows[0]);

  const labels =
    list?.columns?.reduce<Record<string, string>>((acc, column) => {
      acc[column.key] = column.label;
      return acc;
    }, {}) ??
    payload.record?.lineColumns?.reduce<Record<string, string>>((acc, column) => {
      acc[column.key] = column.label;
      return acc;
    }, {}) ??
    {};

  const alignMap = schema.table.columns.reduce<Record<string, string>>((acc, column) => {
    acc[column.key] = column.align ?? "left";
    return acc;
  }, {});
  const monoMap = schema.table.columns.reduce<Record<string, boolean>>((acc, column) => {
    acc[column.key] = column.mono === true;
    return acc;
  }, {});
  // Sensible default: numeric-looking financial columns align right even when
  // the template hasn't configured explicit columns.
  const numericDefaults = new Set([
    "quantity",
    "unitPrice",
    "taxRate",
    "taxAmount",
    "lineTotal",
    "amount",
    "total",
    "subTotal",
  ]);

  const header = keys
    .map((key) => {
      const align = alignMap[key] ?? (numericDefaults.has(key) ? "right" : "left");
      return `<th class="align-${esc(align)}">${esc(labels[key] ?? key)}</th>`;
    })
    .join("");

  const body = sourceRows
    .map((row, rowIndex) => {
      const cells = keys
        .map((key) => {
          const align = alignMap[key] ?? (numericDefaults.has(key) ? "right" : "left");
          const mono = monoMap[key] || numericDefaults.has(key);
          return `<td class="align-${esc(align)}${mono ? " mono" : ""}">${esc(row[key])}</td>`;
        })
        .join("");
      const zebraClass = schema.table.zebra && rowIndex % 2 === 1 ? " zebra" : "";
      return `<tr class="row${zebraClass}">${cells}</tr>`;
    })
    .join("");

  return `<table class="${schema.table.compact ? "compact" : ""}"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

function buildParties(payload: UniversalDocumentPayload): string {
  const parties = payload.parties ?? [];
  if (parties.length === 0) return "";
  const blocks = parties
    .map(
      (party) => `
      <div class="party">
        <div class="party-title">${esc(party.title)}</div>
        ${party.lines.filter(Boolean).map((line) => `<div class="party-line">${esc(line)}</div>`).join("")}
      </div>`,
    )
    .join("");
  return `<section class="parties">${blocks}</section>`;
}

function buildTotals(payload: UniversalDocumentPayload): string {
  const totals = payload.totals ?? [];
  if (totals.length === 0) return "";
  const rows = totals
    .map(
      (row) => `
      <div class="totals-row${row.emphasis ? " totals-emphasis" : ""}">
        <div class="totals-label">${esc(row.label)}</div>
        <div class="totals-value mono">${esc(row.value)}</div>
      </div>`,
    )
    .join("");
  return `<section class="totals-wrap"><div class="totals">${rows}</div></section>`;
}

function buildNotes(payload: UniversalDocumentPayload): string {
  const notes = (payload.notes ?? []).filter(Boolean);
  if (notes.length === 0) return "";
  return `<section class="notes-block">
    <div class="notes-title">Notes</div>
    ${notes.map((note) => `<div class="notes-line">${esc(note)}</div>`).join("")}
  </section>`;
}

function buildRecordSections(payload: UniversalDocumentPayload): string {
  const sections = payload.record?.sections ?? [];
  if (sections.length === 0) return "";
  return `<section class="kv-grid">${sections
    .map((section) => {
      const rows = section.rows
        .map(
          (row) =>
            `<div class="kv-row"><div class="kv-label">${esc(row.label)}</div><div class="kv-value">${esc(row.value)}</div></div>`,
        )
        .join("");
      return `<div class="kv-card"><h3>${esc(section.title)}</h3>${rows}</div>`;
    })
    .join("")}</section>`;
}

function buildDashboard(payload: UniversalDocumentPayload): string {
  const dashboard = payload.dashboard;
  if (!dashboard) return "";
  const metrics = dashboard.metrics
    .map(
      (metric) =>
        `<div class="metric"><div class="metric-label">${esc(metric.label)}</div><div class="metric-value mono">${esc(metric.value)}</div>${metric.detail ? `<div class="metric-detail">${esc(metric.detail)}</div>` : ""}</div>`,
    )
    .join("");
  const notes = (dashboard.notes ?? []).map((note) => `<li>${esc(note)}</li>`).join("");
  return `<div class="metric-grid">${metrics}</div>${notes ? `<ul class="dashboard-notes">${notes}</ul>` : ""}`;
}

function buildIdentityBlock(branding: CompanyBrandingSnapshot, schema: DocumentTemplateSchema): string {
  const identityLines = schema.header.showCompanyIdentity
    ? [
        branding.legalName || branding.displayName,
        branding.tradingName && branding.tradingName !== branding.displayName
          ? `t/a ${branding.tradingName}`
          : null,
        branding.registrationNumber ? `Reg No. ${branding.registrationNumber}` : null,
        branding.vatNumber ? `VAT ${branding.vatNumber}` : branding.taxNumber ? `Tax ${branding.taxNumber}` : null,
      ].filter(Boolean)
    : [];
  const contactLines = schema.header.showContactBlock
    ? [branding.physicalAddress, branding.phone, branding.email, branding.website].filter(Boolean)
    : [];

  if (identityLines.length === 0 && contactLines.length === 0) return "";
  return `<div class="company-block">
    ${identityLines.map((line, index) => `<div class="${index === 0 ? "company-name" : "company-line"}">${esc(line)}</div>`).join("")}
    ${contactLines.map((line) => `<div class="company-line muted">${esc(line)}</div>`).join("")}
  </div>`;
}

function buildFooter(branding: CompanyBrandingSnapshot, schema: DocumentTemplateSchema): string {
  const columns: string[] = [];

  if (schema.footer.showPaymentDetails) {
    const rows = [
      branding.bankName ? ["Bank", branding.bankName] : null,
      branding.bankAccountName ? ["Account Name", branding.bankAccountName] : null,
      branding.bankAccountNumber ? ["Account No.", branding.bankAccountNumber] : null,
      branding.bankSwiftCode ? ["SWIFT", branding.bankSwiftCode] : null,
      branding.bankIban ? ["IBAN", branding.bankIban] : null,
    ].filter((row): row is [string, string] => Boolean(row));
    if (rows.length > 0) {
      columns.push(`<div class="footer-col">
        <div class="footer-title">Payment details</div>
        ${rows.map(([label, value]) => `<div class="footer-kv"><span>${esc(label)}</span><span class="mono">${esc(value)}</span></div>`).join("")}
      </div>`);
    }
  }

  const signatureBits: string[] = [];
  if (schema.footer.showSignature && branding.signatureUrl) {
    signatureBits.push(
      `<div class="sig"><img src="${esc(branding.signatureUrl)}" class="signature" alt="Signature" /><div class="sig-caption">Authorised signature</div></div>`,
    );
  }
  if (schema.footer.showStamp && branding.stampUrl) {
    signatureBits.push(`<img src="${esc(branding.stampUrl)}" class="stamp" alt="Stamp" />`);
  }
  if (signatureBits.length > 0) {
    columns.push(`<div class="footer-col footer-sign">${signatureBits.join("")}</div>`);
  }

  const textBits: string[] = [];
  if (schema.footer.showFooterText && branding.defaultFooterText) {
    textBits.push(`<div class="footer-text">${esc(branding.defaultFooterText)}</div>`);
  }
  if (branding.paymentTerms) {
    textBits.push(`<div class="footer-text muted">${esc(branding.paymentTerms)}</div>`);
  }
  if (schema.footer.showDisclaimer && branding.legalDisclaimer) {
    textBits.push(`<div class="footer-disclaimer">${esc(branding.legalDisclaimer)}</div>`);
  }

  return `${columns.length > 0 ? `<div class="footer-grid">${columns.join("")}</div>` : ""}${textBits.join("")}`;
}

export function renderDocumentHtml(input: {
  payload: UniversalDocumentPayload;
  branding: CompanyBrandingSnapshot;
  template: DocumentTemplateSchema;
}): string {
  const { payload, branding, template } = input;
  const primary = branding.primaryColor || "#111827";
  const margin = template.page.marginMm;
  const fontFamily =
    branding.fontFamily || "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

  const badge = payload.badge
    ? (() => {
        const tone = BADGE_TONES[payload.badge.tone] ?? BADGE_TONES.neutral;
        return `<span class="badge" style="background:${tone.bg};color:${tone.fg};border-color:${tone.border}">${esc(payload.badge.label)}</span>`;
      })()
    : "";

  const meta = (payload.meta ?? [])
    .map(
      (item) =>
        `<div class="meta-item"><div class="meta-label">${esc(item.label)}</div><div class="meta-value">${esc(item.value)}</div></div>`,
    )
    .join("");

  const content = [
    buildParties(payload),
    buildRecordSections(payload),
    buildDashboard(payload),
    buildTable(payload, template),
    buildTotals(payload),
    buildNotes(payload),
  ]
    .filter(Boolean)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${template.page.size} ${template.page.orientation}; margin: ${margin}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #1a1a1a; font-family: ${fontFamily}; font-size: 11.5px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .mono { font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.95em; }
    .muted { color: #6b7280; }

    /* ── Header ─────────────────────────────────────────────── */
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .logos { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
    .logos img { max-height: 52px; max-width: 170px; object-fit: contain; }
    .doc-title-row { display: flex; align-items: baseline; gap: 10px; }
    .doc-title { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${esc(primary)}; }
    .doc-subtitle { margin-top: 2px; color: #4b5563; font-size: 13px; }
    .badge { display: inline-block; border: 1px solid; border-radius: 999px; padding: 2px 10px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; vertical-align: middle; }
    .company-block { text-align: right; line-height: 1.5; max-width: 46%; }
    .company-name { font-weight: 700; font-size: 13px; }
    .company-line { font-size: 11px; }
    .brand-rule { height: 3px; background: ${esc(primary)}; border-radius: 2px; margin: 12px 0 0; }

    /* ── Meta strip ─────────────────────────────────────────── */
    .meta-grid { display: flex; flex-wrap: wrap; gap: 0; margin-top: 12px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .meta-item { flex: 1 1 0; min-width: 110px; padding: 8px 12px; border-right: 1px solid #e5e7eb; }
    .meta-item:last-child { border-right: none; }
    .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }
    .meta-value { margin-top: 3px; font-weight: 600; font-size: 12px; }

    /* ── Parties ────────────────────────────────────────────── */
    .parties { display: flex; gap: 16px; margin-top: 14px; }
    .party { flex: 1 1 0; }
    .party-title { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: ${esc(primary)}; font-weight: 700; margin-bottom: 5px; }
    .party-line { line-height: 1.5; }
    .party-line:first-of-type { font-weight: 600; font-size: 12.5px; }

    /* ── Key/value sections (record exports) ────────────────── */
    .kv-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
    .kv-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; }
    .kv-card h3 { margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }
    .kv-row { display: grid; grid-template-columns: 140px 1fr; gap: 10px; padding: 2px 0; }
    .kv-label { color: #6b7280; }
    .kv-value { font-weight: 600; }

    /* ── Dashboard metrics ──────────────────────────────────── */
    .metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
    .metric { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; }
    .metric-label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
    .metric-value { margin-top: 4px; font-size: 17px; font-weight: 700; }
    .metric-detail { margin-top: 3px; color: #6b7280; }
    .dashboard-notes { margin: 10px 0 0 18px; color: #374151; }

    /* ── Line items ─────────────────────────────────────────── */
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #ffffff; background: ${esc(primary)}; padding: 8px 10px; }
    th:first-child { border-radius: 5px 0 0 0; }
    th:last-child { border-radius: 0 5px 0 0; }
    td { border-bottom: 1px solid #eceff1; padding: 8px 10px; vertical-align: top; }
    table.compact th, table.compact td { padding: 5px 8px; }
    .zebra td { background: #fafafa; }
    .align-left { text-align: left; }
    .align-center { text-align: center; }
    .align-right { text-align: right; }

    /* ── Totals ─────────────────────────────────────────────── */
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 10px; }
    .totals { width: 260px; }
    .totals-row { display: flex; justify-content: space-between; gap: 20px; padding: 4px 10px; }
    .totals-label { color: #4b5563; }
    .totals-value { font-weight: 600; }
    .totals-emphasis { background: ${esc(primary)}; color: #ffffff; border-radius: 5px; margin-top: 4px; padding: 7px 10px; }
    .totals-emphasis .totals-label { color: #ffffff; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; font-size: 10.5px; }
    .totals-emphasis .totals-value { color: #ffffff; font-size: 13px; font-weight: 700; }

    /* ── Notes ──────────────────────────────────────────────── */
    .notes-block { margin-top: 16px; border-left: 3px solid ${esc(primary)}; padding: 6px 12px; background: #fafafa; border-radius: 0 5px 5px 0; }
    .notes-title { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; font-weight: 700; margin-bottom: 3px; }
    .notes-line { color: #374151; }

    /* ── Footer ─────────────────────────────────────────────── */
    .footer { margin-top: 22px; border-top: 1px solid #e5e7eb; padding-top: 12px; color: #374151; }
    .footer-grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 8px; }
    .footer-col { min-width: 200px; }
    .footer-title { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; font-weight: 700; margin-bottom: 4px; }
    .footer-kv { display: flex; justify-content: space-between; gap: 16px; padding: 1px 0; font-size: 10.5px; }
    .footer-kv span:first-child { color: #6b7280; }
    .footer-sign { display: flex; align-items: flex-end; gap: 14px; }
    .signature { max-height: 44px; max-width: 160px; object-fit: contain; }
    .sig-caption { border-top: 1px solid #9ca3af; margin-top: 4px; padding-top: 2px; font-size: 9px; color: #6b7280; text-align: center; }
    .stamp { max-height: 64px; max-width: 110px; object-fit: contain; opacity: 0.9; }
    .footer-text { font-size: 10.5px; margin-top: 4px; }
    .footer-disclaimer { font-size: 9.5px; color: #9ca3af; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="doc">
    <header class="header">
      <div>
        ${
          (template.header.showLogo && branding.logoUrl) ||
          (template.header.showSecondaryLogo && branding.secondaryLogoUrl)
            ? `<div class="logos">
          ${template.header.showLogo && branding.logoUrl ? `<img src="${esc(branding.logoUrl)}" alt="Company logo" />` : ""}
          ${template.header.showSecondaryLogo && branding.secondaryLogoUrl ? `<img src="${esc(branding.secondaryLogoUrl)}" alt="Secondary logo" />` : ""}
        </div>`
            : ""
        }
        <div class="doc-title-row">
          <h1 class="doc-title">${esc(template.labels.documentTitle || payload.title)}</h1>
          ${badge}
        </div>
        ${payload.subtitle ? `<div class="doc-subtitle mono">${esc(payload.subtitle)}</div>` : ""}
      </div>
      ${buildIdentityBlock(branding, template)}
    </header>
    <div class="brand-rule"></div>
    ${meta ? `<section class="meta-grid">${meta}</section>` : ""}
    <main class="content">${content}</main>
    <footer class="footer">${buildFooter(branding, template)}</footer>
  </div>
</body>
</html>`;
}
