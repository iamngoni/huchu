import type { UniversalDocumentPayload } from "@/lib/documents/types";

/**
 * Representative sample payloads used by the template editor's live preview —
 * one per document family, showing every layout region a template can affect.
 */

const SAMPLE_LINES = [
  { description: "Custom logo mat 85×150cm — full colour", quantity: "2", unitPrice: "180.00", taxRate: "15%", lineTotal: "414.00" },
  { description: "Entrance mat 60×90cm — charcoal", quantity: "4", unitPrice: "65.00", taxRate: "15%", lineTotal: "299.00" },
  { description: "On-site measurement & fitting", quantity: "1", unitPrice: "50.00", taxRate: "—", lineTotal: "50.00" },
];

const SAMPLE_LINE_COLUMNS = [
  { key: "description", label: "Description" },
  { key: "quantity", label: "Qty" },
  { key: "unitPrice", label: "Unit Price" },
  { key: "taxRate", label: "Tax" },
  { key: "lineTotal", label: "Amount" },
];

const SAMPLE_PARTY = {
  title: "Bill To",
  lines: ["Acme Retail (Pvt) Ltd", "Jane Moyo", "12 Samora Machel Ave, Harare", "+263 77 123 4567", "accounts@acme.co.zw"],
};

function invoiceSample(): UniversalDocumentPayload {
  return {
    title: "Invoice",
    subtitle: "INV-20260724-1015-482",
    badge: { label: "Awaiting payment", tone: "warning" },
    meta: [
      { label: "Invoice No.", value: "INV-20260724-1015-482" },
      { label: "Issue Date", value: "2026-07-24" },
      { label: "Due Date", value: "2026-08-07" },
      { label: "Currency", value: "USD" },
    ],
    parties: [SAMPLE_PARTY],
    totals: [
      { label: "Subtotal", value: "USD 670.00" },
      { label: "Tax", value: "USD 93.00" },
      { label: "Total", value: "USD 763.00" },
      { label: "Amount paid", value: "USD 300.00" },
      { label: "Balance due", value: "USD 463.00", emphasis: true },
    ],
    notes: ["Payment due within 14 days. Late payments attract 2% monthly interest."],
    record: { sections: [], lineColumns: SAMPLE_LINE_COLUMNS, lines: SAMPLE_LINES },
  };
}

function quotationSample(): UniversalDocumentPayload {
  return {
    ...invoiceSample(),
    title: "Quotation",
    subtitle: "QTN-20260724-0930-217",
    badge: { label: "Awaiting response", tone: "warning" },
    meta: [
      { label: "Quotation No.", value: "QTN-20260724-0930-217" },
      { label: "Date", value: "2026-07-24" },
      { label: "Valid Until", value: "2026-08-24" },
      { label: "Currency", value: "USD" },
    ],
    parties: [{ ...SAMPLE_PARTY, title: "Prepared For" }],
    totals: [
      { label: "Subtotal", value: "USD 670.00" },
      { label: "Tax", value: "USD 93.00" },
      { label: "Total", value: "USD 763.00", emphasis: true },
    ],
    notes: ["This quotation is valid until 2026-08-24."],
  };
}

function receiptSample(): UniversalDocumentPayload {
  return {
    title: "Payment Receipt",
    subtitle: "REC-20260724-1130-664",
    badge: { label: "Payment received", tone: "positive" },
    meta: [
      { label: "Receipt No.", value: "REC-20260724-1130-664" },
      { label: "Date", value: "2026-07-24" },
      { label: "Method", value: "Bank transfer" },
    ],
    parties: [{ ...SAMPLE_PARTY, title: "Received From" }],
    totals: [{ label: "Amount received", value: "USD 300.00", emphasis: true }],
    notes: ["Thank you for your payment. Applied to invoice INV-20260724-1015-482."],
    record: {
      sections: [],
      lineColumns: [
        { key: "description", label: "Description" },
        { key: "method", label: "Method" },
        { key: "reference", label: "Reference" },
        { key: "amount", label: "Amount" },
      ],
      lines: [
        { description: "Payment against invoice INV-20260724-1015-482", method: "Bank transfer", reference: "TRF-99812", amount: "300.00" },
      ],
    },
  };
}

function reportSample(): UniversalDocumentPayload {
  return {
    title: "Report",
    subtitle: "Sample export",
    meta: [
      { label: "Range", value: "2026-07-01 → 2026-07-24" },
      { label: "Rows", value: "3" },
    ],
    list: {
      columns: [
        { key: "date", label: "Date" },
        { key: "reference", label: "Reference" },
        { key: "status", label: "Status" },
        { key: "amount", label: "Amount" },
      ],
      rows: [
        { date: "2026-07-21", reference: "REF-0031", status: "COMPLETE", amount: "410.00" },
        { date: "2026-07-22", reference: "REF-0032", status: "COMPLETE", amount: "185.50" },
        { date: "2026-07-23", reference: "REF-0033", status: "PENDING", amount: "96.00" },
      ],
    },
  };
}

function dashboardSample(): UniversalDocumentPayload {
  return {
    title: "Executive Summary",
    subtitle: "Sample export",
    dashboard: {
      metrics: [
        { label: "Revenue", value: "USD 12,480", detail: "+8% vs last period" },
        { label: "Open Orders", value: "23" },
        { label: "Collections", value: "USD 9,210" },
      ],
      notes: ["Figures shown are sample data for template preview."],
    },
  };
}

export function getSamplePayload(sourceKey: string): UniversalDocumentPayload {
  switch (sourceKey) {
    case "accounting.sales.invoice":
      return invoiceSample();
    case "accounting.sales.quotation":
      return quotationSample();
    case "accounting.sales.receipt":
      return receiptSample();
    case "accounting.sales.credit-note":
      return {
        ...quotationSample(),
        title: "Credit Note",
        subtitle: "CRN-20260724-002",
        badge: { label: "Issued", tone: "positive" },
        totals: [{ label: "Total credited", value: "USD 120.00", emphasis: true }],
        notes: ["Goods returned in good order."],
      };
    case "dashboard.executive-summary":
      return dashboardSample();
    default:
      return reportSample();
  }
}
