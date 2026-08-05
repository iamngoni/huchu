import { fetchJson } from "@/lib/api-client";

type QueryValue = string | number | boolean | null | undefined;

function buildQuery(params: Record<string, QueryValue>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
};

type PaginationResponse<T> = {
  data: T[];
  pagination: PaginationMeta;
};

type ApiResponse<T> = {
  success?: true;
  data: T;
};

export type SchoolsFeesSummary = {
  resource: "schools-fees";
  companyId: string;
  summary: {
    structures: number;
    activeStructures: number;
    invoices: number;
    issuedInvoices: number;
    overdueInvoices: number;
    receiptsPosted: number;
    /** The currency the money figures below are stated in (S-2.2). */
    currency: string;
    waivedAmount: number;
    outstandingBalance: number;
    /** S-2.5. Overpayments and over-settled invoices, net of refunds held. */
    creditOnAccount: number;
  };
};

export type SchoolFeeStructureRecord = {
  id: string;
  name: string;
  currency: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  term: { id: string; code: string; name: string };
  class: { id: string; code: string; name: string };
  _count: { lines: number; invoices: number };
  totals?: { amount: number; mandatoryAmount: number };
  lines?: Array<{
    id: string;
    feeCode: string;
    description: string;
    amount: number;
    isMandatory: boolean;
    sortOrder: number;
  }>;
};

export type SchoolFeeInvoiceRecord = {
  id: string;
  invoiceNo: string;
  status: "DRAFT" | "ISSUED" | "PART_PAID" | "PAID" | "VOIDED" | "WRITEOFF";
  issueDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: number;
  baseAmount: number;
  totalAmount: number;
  paidAmount: number;
  waivedAmount: number;
  writeOffAmount: number;
  balanceAmount: number;
  /** S-2.5. Settled beyond the total — the mirror of `balanceAmount`. */
  creditAmount: number;
  student: {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    status: string;
  };
  term: { id: string; code: string; name: string };
  _count: { lines: number; receiptAllocations: number; waivers: number };
};

export type SchoolFeeReceiptRecord = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "CARD" | "MOBILE_MONEY";
  reference: string | null;
  currency: string;
  exchangeRate: number;
  baseAmount: number;
  amountReceived: number;
  amountAllocated: number;
  amountUnallocated: number;
  /** S-2.6. The part of the surplus a refund is already holding. */
  refundedAmount: number;
  status: "DRAFT" | "POSTED" | "VOIDED";
  student: {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
  };
  _count: { allocations: number };
};

export type SchoolFeeWaiverRecord = {
  id: string;
  waiverType: "SCHOLARSHIP" | "DISCOUNT" | "HARDSHIP" | "OTHER";
  currency: string;
  exchangeRate: number;
  baseAmount: number;
  amount: number;
  status: "DRAFT" | "APPROVED" | "APPLIED" | "REJECTED" | "REVERSED";
  reason: string | null;
  student: {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
  };
  term: { id: string; code: string; name: string };
  invoice: {
    id: string;
    invoiceNo: string;
    status: string;
    balanceAmount: number;
  } | null;
  createdAt: string;
};

export async function fetchSchoolsFeesSummary() {
  const response = await fetchJson<ApiResponse<SchoolsFeesSummary>>("/api/v2/schools/fees");
  return response.data;
}

export async function fetchSchoolFeeStructures(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  termId?: string;
  classId?: string;
  includeLines?: boolean;
} = {}) {
  const query = buildQuery(params);
  return fetchJson<PaginationResponse<SchoolFeeStructureRecord>>(
    `/api/v2/schools/fees/structures${query}`,
  );
}

export async function fetchSchoolFeeInvoices(params: {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  /** Filtered through the student's current class — see the route's note. */
  classId?: string;
  streamId?: string;
  termId?: string;
  status?: "DRAFT" | "ISSUED" | "PART_PAID" | "PAID" | "VOIDED" | "WRITEOFF";
} = {}) {
  const query = buildQuery(params);
  return fetchJson<PaginationResponse<SchoolFeeInvoiceRecord>>(
    `/api/v2/schools/fees/invoices${query}`,
  );
}

export async function bulkGenerateInvoices(params: {
  termId: string;
  classId?: string;
  streamId?: string;
  feeStructureId: string;
  issueDate: string;
  dueDate: string;
  issueNow?: boolean;
  notes?: string;
  /** S-2.4. Defaults to true server-side; pass false to be told about clashes. */
  skipExisting?: boolean;
}) {
  return fetchJson<{
    success: boolean;
    data: {
      success: true;
      message: string;
      created: number;
      skipped: number;
      errors: Array<{ studentId: string; studentNo: string; error: string }>;
      summary: {
        totalEligible: number;
        feeStructure: {
          id: string;
          name: string;
          class: string;
          term: string;
        };
      };
    };
  }>("/api/v2/schools/fees/invoices/bulk-generate", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function fetchSchoolFeeReceipts(params: {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  status?: "DRAFT" | "POSTED" | "VOIDED";
} = {}) {
  const query = buildQuery(params);
  return fetchJson<PaginationResponse<SchoolFeeReceiptRecord>>(
    `/api/v2/schools/fees/receipts${query}`,
  );
}

export async function fetchSchoolFeeWaivers(params: {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  termId?: string;
  status?: "DRAFT" | "APPROVED" | "APPLIED" | "REJECTED" | "REVERSED";
} = {}) {
  const query = buildQuery(params);
  return fetchJson<PaginationResponse<SchoolFeeWaiverRecord>>(
    `/api/v2/schools/fees/waivers${query}`,
  );
}

/**
 * S-2.5 — a credit the school is holding for a family.
 *
 * Two kinds, and the distinction matters when you go to spend it: a `RECEIPT`
 * credit is a payment larger than what it settled, an `INVOICE` credit is a
 * bill settled beyond its total.
 */
export type SchoolFeeCreditRecord = {
  kind: "RECEIPT" | "INVOICE";
  sourceId: string;
  reference: string;
  date: string;
  currency: string;
  credit: number;
  heldForRefund: number;
  available: number;
  student: {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
  };
};

export type SchoolFeeRefundRecord = {
  id: string;
  refundNo: string;
  refundDate: string;
  method: "CASH" | "BANK_TRANSFER" | "CARD" | "MOBILE_MONEY";
  reference: string | null;
  reason: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  baseAmount: number;
  status: "REQUESTED" | "PAID" | "CANCELLED";
  paidAt: string | null;
  student: {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
  };
  receipt: { id: string; receiptNo: string } | null;
  invoice: { id: string; invoiceNo: string } | null;
};

export async function fetchSchoolFeeCredits(params: {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
} = {}) {
  const query = buildQuery(params);
  return fetchJson<PaginationResponse<SchoolFeeCreditRecord>>(
    `/api/v2/schools/fees/credits${query}`,
  );
}

export async function fetchSchoolFeeRefunds(params: {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: string;
  status?: "REQUESTED" | "PAID" | "CANCELLED";
} = {}) {
  const query = buildQuery(params);
  return fetchJson<PaginationResponse<SchoolFeeRefundRecord>>(
    `/api/v2/schools/finance/refunds${query}`,
  );
}

/**
 * Spend a receipt's credit on invoices.
 *
 * Omit `allocatedAmount` on every line to let the credit settle them oldest
 * first until it runs out; give it on every line to split deliberately. Mixing
 * the two is refused.
 */
export async function allocateReceiptCredit(
  receiptId: string,
  allocations: Array<{ invoiceId: string; allocatedAmount?: number }>,
) {
  return fetchJson<SchoolFeeReceiptRecord>(
    `/api/v2/schools/fees/receipts/${receiptId}/allocate`,
    { method: "POST", body: JSON.stringify({ allocations }) },
  );
}

export async function requestSchoolFeeRefund(params: {
  receiptId?: string;
  invoiceId?: string;
  amount: number;
  method: "CASH" | "BANK_TRANSFER" | "CARD" | "MOBILE_MONEY";
  reason: string;
  reference?: string;
  refundDate?: string;
}) {
  return fetchJson<SchoolFeeRefundRecord>("/api/v2/schools/finance/refunds", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function paySchoolFeeRefund(
  refundId: string,
  params: { reference?: string } = {},
) {
  return fetchJson<SchoolFeeRefundRecord>(
    `/api/v2/schools/finance/refunds/${refundId}/pay`,
    { method: "POST", body: JSON.stringify(params) },
  );
}

export async function cancelSchoolFeeRefund(refundId: string, reason: string) {
  return fetchJson<SchoolFeeRefundRecord>(
    `/api/v2/schools/finance/refunds/${refundId}/cancel`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
}
