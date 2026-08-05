"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NumericCell } from "@/components/ui/numeric-cell";
import { VerticalDataViews } from "@/components/ui/vertical-data-views";
// The repo's `components/ui/select` is the Radix compound API, which is the
// wrong shape for a four-option picker; its own header says to reach for the DS
// component when a plain options list is all that is wanted. This also replaces
// the hand-rolled `<select>` the receipt dialog carried, which had a hard-coded
// border, height and ring on it.
import { Select } from "@corelithzw/react";
import { PersonAvatar } from "@/components/schools/common/person-avatar";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { formatSchoolDate, formatSchoolMoney } from "@/lib/schools/format";
import {
  allocateReceiptCredit,
  cancelSchoolFeeRefund,
  fetchSchoolFeeCredits,
  fetchSchoolFeeInvoices,
  fetchSchoolFeeReceipts,
  fetchSchoolFeeRefunds,
  fetchSchoolFeeStructures,
  fetchSchoolFeeWaivers,
  fetchSchoolsFeesSummary,
  paySchoolFeeRefund,
  requestSchoolFeeRefund,
  type SchoolFeeCreditRecord,
  type SchoolFeeInvoiceRecord,
  type SchoolFeeReceiptRecord,
  type SchoolFeeRefundRecord,
  type SchoolFeeStructureRecord,
  type SchoolFeeWaiverRecord,
} from "@/lib/schools/fees-v2";
import { BulkGenerateInvoicesDialog } from "./bulk-generate-invoices-dialog";
import { CopyStructureDialog } from "./copy-structure-dialog";

type FeesView =
  | "structures"
  | "invoices"
  | "receipts"
  | "credits"
  | "refunds"
  | "waivers";

const initialInvoiceForm = { studentId: "", termId: "", description: "", amount: "" };
const initialReceiptForm = { invoiceId: "", amount: "", method: "", reference: "" };
const initialRefundForm = { amount: "", method: "CASH", reason: "", reference: "" };
const initialAllocateForm = { invoiceId: "", amount: "" };

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
];

/**
 * A person, with a face, wherever this screen lists one.
 *
 * The student number stays mono because it is an identifier, per the value
 * formatting table.
 */
function StudentCell({
  student,
}: {
  student: { firstName: string; lastName: string; studentNo: string };
}) {
  return (
    <div className="flex items-center gap-2">
      <PersonAvatar firstName={student.firstName} lastName={student.lastName} />
      <div>
        <div className="font-medium">
          {student.firstName} {student.lastName}
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {student.studentNo}
        </div>
      </div>
    </div>
  );
}

function invoiceStatusBadge(status: SchoolFeeInvoiceRecord["status"]) {
  if (status === "ISSUED") return <Badge variant="secondary">Issued</Badge>;
  if (status === "PART_PAID") return <Badge variant="secondary">Part Paid</Badge>;
  if (status === "PAID") return <Badge variant="outline">Paid</Badge>;
  if (status === "VOIDED") return <Badge variant="destructive">Voided</Badge>;
  if (status === "WRITEOFF") return <Badge variant="outline">Write-off</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

function receiptStatusBadge(status: SchoolFeeReceiptRecord["status"]) {
  if (status === "POSTED") return <Badge variant="secondary">Posted</Badge>;
  if (status === "VOIDED") return <Badge variant="destructive">Voided</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

function waiverStatusBadge(status: SchoolFeeWaiverRecord["status"]) {
  if (status === "APPLIED") return <Badge variant="secondary">Applied</Badge>;
  if (status === "APPROVED") return <Badge variant="outline">Approved</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>;
  if (status === "REVERSED") return <Badge variant="outline">Reversed</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

function refundStatusBadge(status: SchoolFeeRefundRecord["status"]) {
  if (status === "PAID") return <Badge variant="secondary">Paid</Badge>;
  if (status === "CANCELLED") return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="outline">Requested</Badge>;
}

function structureStatusBadge(status: SchoolFeeStructureRecord["status"]) {
  if (status === "ACTIVE") return <Badge variant="secondary">Active</Badge>;
  if (status === "ARCHIVED") return <Badge variant="outline">Archived</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

export function SchoolsFeesContent() {
  const [activeView, setActiveView] = useState<FeesView>("invoices");
  const queryClient = useQueryClient();

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  // Which fee sheet the "Copy to…" dialog is about. Held as the record rather
  // than the id so the dialog can name its lines and its total without a second
  // fetch of a list it is already looking at.
  const [copySource, setCopySource] = useState<SchoolFeeStructureRecord | null>(null);
  const [invoiceForm, setInvoiceForm] = useState(initialInvoiceForm);

  const [bulkGenerateDialogOpen, setBulkGenerateDialogOpen] = useState(false);

  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptForm, setReceiptForm] = useState(initialReceiptForm);

  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: typeof invoiceForm) =>
      fetchJson("/api/v2/schools/fees/invoices", {
        method: "POST",
        body: JSON.stringify({
          studentId: payload.studentId,
          termId: payload.termId,
          description: payload.description || undefined,
          amount: parseFloat(payload.amount) || 0,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools", "fees", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["schools", "fees", "summary"] });
      setInvoiceForm(initialInvoiceForm);
      setInvoiceDialogOpen(false);
    },
  });

  const createReceiptMutation = useMutation({
    mutationFn: async (payload: typeof receiptForm) =>
      fetchJson("/api/v2/schools/fees/receipts", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: payload.invoiceId,
          amount: parseFloat(payload.amount) || 0,
          method: payload.method,
          reference: payload.reference || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools", "fees", "receipts"] });
      queryClient.invalidateQueries({ queryKey: ["schools", "fees", "summary"] });
      setReceiptForm(initialReceiptForm);
      setReceiptDialogOpen(false);
    },
  });

  const handleInvoiceDialogOpenChange = (open: boolean) => {
    setInvoiceDialogOpen(open);
    if (!open) {
      setInvoiceForm(initialInvoiceForm);
      createInvoiceMutation.reset();
    }
  };

  const handleReceiptDialogOpenChange = (open: boolean) => {
    setReceiptDialogOpen(open);
    if (!open) {
      setReceiptForm(initialReceiptForm);
      createReceiptMutation.reset();
    }
  };

  const handleInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.studentId || !invoiceForm.termId || !invoiceForm.amount) return;
    createInvoiceMutation.mutate(invoiceForm);
  };

  const handleReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptForm.invoiceId || !receiptForm.amount || !receiptForm.method) return;
    createReceiptMutation.mutate(receiptForm);
  };

  // S-2.5 / S-2.6. A credit is picked from the list and then either spent on an
  // invoice or handed back, so both dialogs are anchored on the row the bursar
  // clicked rather than asking them to type an id twice.
  const [creditSource, setCreditSource] = useState<SchoolFeeCreditRecord | null>(null);
  const [allocateForm, setAllocateForm] = useState(initialAllocateForm);
  const [refundSource, setRefundSource] = useState<SchoolFeeCreditRecord | null>(null);
  const [refundForm, setRefundForm] = useState(initialRefundForm);
  const [cancelTarget, setCancelTarget] = useState<SchoolFeeRefundRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const invalidateMoney = () => {
    queryClient.invalidateQueries({ queryKey: ["schools", "fees", "summary"] });
    queryClient.invalidateQueries({ queryKey: ["schools", "fees", "invoices"] });
    queryClient.invalidateQueries({ queryKey: ["schools", "fees", "receipts"] });
    queryClient.invalidateQueries({ queryKey: ["schools", "fees", "credits"] });
    queryClient.invalidateQueries({ queryKey: ["schools", "fees", "refunds"] });
  };

  const allocateCreditMutation = useMutation({
    mutationFn: async (payload: {
      receiptId: string;
      invoiceId: string;
      amount: string;
    }) =>
      allocateReceiptCredit(payload.receiptId, [
        {
          invoiceId: payload.invoiceId,
          // Left blank, the credit settles the invoice as far as it goes.
          ...(payload.amount ? { allocatedAmount: parseFloat(payload.amount) } : {}),
        },
      ]),
    onSuccess: () => {
      invalidateMoney();
      setCreditSource(null);
      setAllocateForm(initialAllocateForm);
    },
  });

  const requestRefundMutation = useMutation({
    mutationFn: async (payload: {
      source: SchoolFeeCreditRecord;
      form: typeof initialRefundForm;
    }) =>
      requestSchoolFeeRefund({
        ...(payload.source.kind === "RECEIPT"
          ? { receiptId: payload.source.sourceId }
          : { invoiceId: payload.source.sourceId }),
        amount: parseFloat(payload.form.amount) || 0,
        method: payload.form.method as "CASH",
        reason: payload.form.reason,
        reference: payload.form.reference || undefined,
      }),
    onSuccess: () => {
      invalidateMoney();
      setRefundSource(null);
      setRefundForm(initialRefundForm);
    },
  });

  const payRefundMutation = useMutation({
    mutationFn: async (refundId: string) => paySchoolFeeRefund(refundId),
    onSuccess: invalidateMoney,
  });

  const cancelRefundMutation = useMutation({
    mutationFn: async (payload: { refundId: string; reason: string }) =>
      cancelSchoolFeeRefund(payload.refundId, payload.reason),
    onSuccess: () => {
      invalidateMoney();
      setCancelTarget(null);
      setCancelReason("");
    },
  });

  const handleAllocateDialogOpenChange = (open: boolean) => {
    if (!open) {
      setCreditSource(null);
      setAllocateForm(initialAllocateForm);
      allocateCreditMutation.reset();
    }
  };

  const handleRefundDialogOpenChange = (open: boolean) => {
    if (!open) {
      setRefundSource(null);
      setRefundForm(initialRefundForm);
      requestRefundMutation.reset();
    }
  };

  const handleCancelDialogOpenChange = (open: boolean) => {
    if (!open) {
      setCancelTarget(null);
      setCancelReason("");
      cancelRefundMutation.reset();
    }
  };

  const handleAllocateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditSource || !allocateForm.invoiceId) return;
    allocateCreditMutation.mutate({
      receiptId: creditSource.sourceId,
      invoiceId: allocateForm.invoiceId,
      amount: allocateForm.amount,
    });
  };

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundSource || !refundForm.amount || !refundForm.reason) return;
    requestRefundMutation.mutate({ source: refundSource, form: refundForm });
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget || !cancelReason.trim()) return;
    cancelRefundMutation.mutate({
      refundId: cancelTarget.id,
      reason: cancelReason.trim(),
    });
  };

  const summaryQuery = useQuery({
    queryKey: ["schools", "fees", "summary"],
    queryFn: () => fetchSchoolsFeesSummary(),
  });
  const structuresQuery = useQuery({
    queryKey: ["schools", "fees", "structures"],
    // `includeLines` is what makes the totals real. Without it the route has no
    // lines to add up and every structure in this table read "$0.00 a term" — a
    // fee sheet that appears to charge nothing, which is worse than no column.
    queryFn: () => fetchSchoolFeeStructures({ page: 1, limit: 200, includeLines: true }),
  });
  const invoicesQuery = useQuery({
    queryKey: ["schools", "fees", "invoices"],
    queryFn: () => fetchSchoolFeeInvoices({ page: 1, limit: 200 }),
  });
  const receiptsQuery = useQuery({
    queryKey: ["schools", "fees", "receipts"],
    queryFn: () => fetchSchoolFeeReceipts({ page: 1, limit: 200 }),
  });
  const waiversQuery = useQuery({
    queryKey: ["schools", "fees", "waivers"],
    queryFn: () => fetchSchoolFeeWaivers({ page: 1, limit: 200 }),
  });
  const creditsQuery = useQuery({
    queryKey: ["schools", "fees", "credits"],
    queryFn: () => fetchSchoolFeeCredits({ page: 1, limit: 200 }),
  });
  const refundsQuery = useQuery({
    queryKey: ["schools", "fees", "refunds"],
    queryFn: () => fetchSchoolFeeRefunds({ page: 1, limit: 200 }),
  });

  const structures = useMemo(() => structuresQuery.data?.data ?? [], [structuresQuery.data]);
  const invoices = useMemo(() => invoicesQuery.data?.data ?? [], [invoicesQuery.data]);
  const receipts = useMemo(() => receiptsQuery.data?.data ?? [], [receiptsQuery.data]);
  const waivers = useMemo(() => waiversQuery.data?.data ?? [], [waiversQuery.data]);
  const credits = useMemo(() => creditsQuery.data?.data ?? [], [creditsQuery.data]);
  const refunds = useMemo(() => refundsQuery.data?.data ?? [], [refundsQuery.data]);

  const structuresColumns = useMemo<ColumnDef<SchoolFeeStructureRecord>[]>(
    () => [
      {
        id: "name",
        header: "Fee Structure",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.class.name} / {row.original.term.name}
            </div>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => structureStatusBadge(row.original.status),
      },
      {
        id: "lines",
        header: "Lines",
        cell: ({ row }) => <NumericCell>{row.original._count.lines}</NumericCell>,
      },
      {
        id: "amount",
        header: "Total Amount",
        cell: ({ row }) => (
          <NumericCell>
            {formatSchoolMoney(row.original.totals?.amount ?? 0, row.original.currency)}
          </NumericCell>
        ),
      },
      {
        id: "mandatoryAmount",
        header: "Mandatory Amount",
        cell: ({ row }) => (
          <NumericCell>
            {formatSchoolMoney(
              row.original.totals?.mandatoryAmount ?? 0,
              row.original.currency,
            )}
          </NumericCell>
        ),
      },
      {
        id: "currency",
        header: "Currency",
        cell: ({ row }) => <NumericCell align="left">{row.original.currency}</NumericCell>,
      },
      {
        id: "copy",
        header: "",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCopySource(row.original)}
          >
            Copy to…
          </Button>
        ),
      },
    ],
    [],
  );

  const invoiceColumns = useMemo<ColumnDef<SchoolFeeInvoiceRecord>[]>(
    () => [
      {
        id: "invoiceNo",
        header: "Invoice No",
        cell: ({ row }) => <NumericCell align="left">{row.original.invoiceNo}</NumericCell>,
      },
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => <StudentCell student={row.original.student} />,
      },
      {
        id: "term",
        header: "Term",
        cell: ({ row }) => row.original.term.name,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => invoiceStatusBadge(row.original.status),
      },
      {
        id: "totalAmount",
        header: "Total",
        cell: ({ row }) => <NumericCell>
            {formatSchoolMoney(row.original.totalAmount, row.original.currency)}
          </NumericCell>,
      },
      {
        id: "paidAmount",
        header: "Paid",
        cell: ({ row }) => <NumericCell>
            {formatSchoolMoney(row.original.paidAmount, row.original.currency)}
          </NumericCell>,
      },
      {
        id: "balanceAmount",
        header: "Outstanding",
        cell: ({ row }) => <NumericCell>
            {formatSchoolMoney(row.original.balanceAmount, row.original.currency)}
          </NumericCell>,
      },
      {
        id: "dueDate",
        header: "Due Date",
        cell: ({ row }) => <NumericCell>{formatSchoolDate(row.original.dueDate)}</NumericCell>,
      },
    ],
    [],
  );

  const receiptColumns = useMemo<ColumnDef<SchoolFeeReceiptRecord>[]>(
    () => [
      {
        id: "receiptNo",
        header: "Receipt No",
        cell: ({ row }) => <NumericCell align="left">{row.original.receiptNo}</NumericCell>,
      },
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => <StudentCell student={row.original.student} />,
      },
      {
        id: "paymentMethod",
        header: "Payment Method",
        cell: ({ row }) => row.original.paymentMethod.replaceAll("_", " "),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => receiptStatusBadge(row.original.status),
      },
      {
        id: "amountReceived",
        header: "Received",
        cell: ({ row }) => <NumericCell>
            {formatSchoolMoney(row.original.amountReceived, row.original.currency)}
          </NumericCell>,
      },
      {
        id: "amountAllocated",
        header: "Allocated",
        cell: ({ row }) => <NumericCell>
            {formatSchoolMoney(row.original.amountAllocated, row.original.currency)}
          </NumericCell>,
      },
      {
        id: "amountUnallocated",
        header: "Unallocated",
        cell: ({ row }) => <NumericCell>
            {formatSchoolMoney(row.original.amountUnallocated, row.original.currency)}
          </NumericCell>,
      },
      {
        id: "receiptDate",
        header: "Receipt Date",
        cell: ({ row }) => <NumericCell>{formatSchoolDate(row.original.receiptDate)}</NumericCell>,
      },
    ],
    [],
  );

  const creditColumns = useMemo<ColumnDef<SchoolFeeCreditRecord>[]>(
    () => [
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => <StudentCell student={row.original.student} />,
      },
      {
        id: "source",
        header: "From",
        cell: ({ row }) => (
          <div>
            <NumericCell align="left">{row.original.reference}</NumericCell>
            <div className="text-xs text-muted-foreground">
              {row.original.kind === "RECEIPT" ? "Overpayment" : "Over-settled bill"}
            </div>
          </div>
        ),
      },
      {
        id: "credit",
        header: "Credit",
        cell: ({ row }) => (
          <NumericCell>
            {formatSchoolMoney(row.original.credit, row.original.currency)}
          </NumericCell>
        ),
      },
      {
        id: "heldForRefund",
        header: "Held for refund",
        cell: ({ row }) => (
          <NumericCell>
            {formatSchoolMoney(row.original.heldForRefund, row.original.currency)}
          </NumericCell>
        ),
      },
      {
        id: "available",
        header: "Available",
        cell: ({ row }) => (
          <NumericCell className="font-medium">
            {formatSchoolMoney(row.original.available, row.original.currency)}
          </NumericCell>
        ),
      },
      {
        id: "date",
        header: "Since",
        cell: ({ row }) => <NumericCell>{formatSchoolDate(row.original.date)}</NumericCell>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {/* An invoice credit has no receipt to allocate from — it is
                already sitting on the bill it over-settled. Only a receipt
                surplus can be moved to another invoice. */}
            {row.original.kind === "RECEIPT" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={row.original.available <= 0}
                onClick={() => {
                  setCreditSource(row.original);
                  setAllocateForm(initialAllocateForm);
                }}
              >
                Allocate
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={row.original.available <= 0}
              onClick={() => {
                setRefundSource(row.original);
                setRefundForm({
                  ...initialRefundForm,
                  amount: row.original.available.toFixed(2),
                });
              }}
            >
              Refund
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const refundColumns = useMemo<ColumnDef<SchoolFeeRefundRecord>[]>(
    () => [
      {
        id: "refundNo",
        header: "Refund No",
        cell: ({ row }) => <NumericCell align="left">{row.original.refundNo}</NumericCell>,
      },
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => <StudentCell student={row.original.student} />,
      },
      {
        id: "source",
        header: "From",
        cell: ({ row }) => (
          <NumericCell align="left">
            {row.original.receipt?.receiptNo ??
              row.original.invoice?.invoiceNo ??
              "—"}
          </NumericCell>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => refundStatusBadge(row.original.status),
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <NumericCell>
            {formatSchoolMoney(row.original.amount, row.original.currency)}
          </NumericCell>
        ),
      },
      {
        id: "method",
        header: "Method",
        cell: ({ row }) =>
          PAYMENT_METHODS.find((method) => method.value === row.original.method)
            ?.label ?? row.original.method,
      },
      {
        id: "refundDate",
        header: "Requested",
        cell: ({ row }) => (
          <NumericCell>{formatSchoolDate(row.original.refundDate)}</NumericCell>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) =>
          row.original.status === "REQUESTED" ? (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                onClick={() => payRefundMutation.mutate(row.original.id)}
                disabled={payRefundMutation.isPending}
              >
                Pay
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCancelTarget(row.original);
                  setCancelReason("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">No action left</span>
          ),
      },
    ],
    [payRefundMutation],
  );

  const waiverColumns = useMemo<ColumnDef<SchoolFeeWaiverRecord>[]>(
    () => [
      {
        id: "student",
        header: "Student",
        cell: ({ row }) => <StudentCell student={row.original.student} />,
      },
      {
        id: "waiverType",
        header: "Waiver Type",
        cell: ({ row }) => row.original.waiverType,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => waiverStatusBadge(row.original.status),
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => <NumericCell>
            {formatSchoolMoney(row.original.amount, row.original.currency)}
          </NumericCell>,
      },
      {
        id: "invoice",
        header: "Invoice",
        cell: ({ row }) =>
          row.original.invoice ? (
            <NumericCell align="left">{row.original.invoice.invoiceNo}</NumericCell>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          ),
      },
      {
        id: "createdAt",
        header: "Created",
        cell: ({ row }) => <NumericCell>{formatSchoolDate(row.original.createdAt)}</NumericCell>,
      },
    ],
    [],
  );

  const summary = summaryQuery.data?.summary;
  const primaryError =
    summaryQuery.error ||
    structuresQuery.error ||
    invoicesQuery.error ||
    receiptsQuery.error ||
    waiversQuery.error ||
    creditsQuery.error ||
    refundsQuery.error;
  const isLoading =
    summaryQuery.isLoading ||
    structuresQuery.isLoading ||
    invoicesQuery.isLoading ||
    receiptsQuery.isLoading ||
    waiversQuery.isLoading ||
    creditsQuery.isLoading ||
    refundsQuery.isLoading;

  return (
    <div className="space-y-4">
      {primaryError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load schools fees data</AlertTitle>
          <AlertDescription>{getApiErrorMessage(primaryError)}</AlertDescription>
        </Alert>
      ) : null}

      <section className="section-shell grid gap-2 md:grid-cols-5">
        <div>
          <h2 className="text-sm font-semibold">Outstanding Balance</h2>
          <p className="font-mono tabular-nums">
            {formatSchoolMoney(summary?.outstandingBalance ?? 0, summary?.currency)}
          </p>
        </div>
        <div>
          {/* The figure behind this counts ISSUED and PART_PAID — invoices
              still owing something. It was labelled "Issued Invoices", which
              read as nought beside three invoices that had been issued and
              paid. The count is right; the word was wrong. */}
          <h2 className="text-sm font-semibold">Unpaid invoices</h2>
          <p className="font-mono tabular-nums">{summary?.issuedInvoices ?? 0}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Posted Receipts</h2>
          <p className="font-mono tabular-nums">{summary?.receiptsPosted ?? 0}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Applied Waivers</h2>
          <p className="font-mono tabular-nums">
            {formatSchoolMoney(summary?.waivedAmount ?? 0, summary?.currency)}
          </p>
        </div>
        {/* S-2.5. Money the school is holding that belongs to families. It sits
            beside the arrears deliberately: a school can be owed and owing at
            once, and a bursar chasing the first should see the second. */}
        <div>
          <h2 className="text-sm font-semibold">Credit on account</h2>
          <p className="font-mono tabular-nums">
            {formatSchoolMoney(summary?.creditOnAccount ?? 0, summary?.currency)}
          </p>
        </div>
      </section>

      <VerticalDataViews
        items={[
          { id: "invoices", label: "Invoices", count: invoices.length },
          { id: "receipts", label: "Receipts", count: receipts.length },
          { id: "credits", label: "Credits", count: credits.length },
          { id: "refunds", label: "Refunds", count: refunds.length },
          { id: "waivers", label: "Waivers", count: waivers.length },
          { id: "structures", label: "Fee Structures", count: structures.length },
        ]}
        value={activeView}
        onValueChange={(value) => setActiveView(value as FeesView)}
        railLabel="Fee Views"
      >
        <div className={activeView === "invoices" ? "space-y-2" : "hidden"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-section-title">Fee Invoices</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkGenerateDialogOpen(true)}
              >
                Bulk Generate
              </Button>
              <Button size="sm" onClick={() => setInvoiceDialogOpen(true)}>
                Create Invoice
              </Button>
            </div>
          </div>
          <DataTable
            data={invoices}
            columns={invoiceColumns}
            searchPlaceholder="Search invoices"
            searchSubmitLabel="Search"
            pagination={{ enabled: true }}
            emptyState={isLoading ? "Loading fee invoices..." : "No fee invoices found."}
          />
        </div>

        <div className={activeView === "receipts" ? "space-y-2" : "hidden"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-section-title">Fee Receipts</h2>
            <Button size="sm" onClick={() => setReceiptDialogOpen(true)}>
              Record Receipt
            </Button>
          </div>
          <DataTable
            data={receipts}
            columns={receiptColumns}
            searchPlaceholder="Search receipts"
            searchSubmitLabel="Search"
            pagination={{ enabled: true }}
            emptyState={isLoading ? "Loading fee receipts..." : "No fee receipts found."}
          />
        </div>

        <div className={activeView === "credits" ? "space-y-2" : "hidden"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-section-title">Credit on account</h2>
          </div>
          {allocateCreditMutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>The credit could not be allocated</AlertTitle>
              <AlertDescription>
                {getApiErrorMessage(allocateCreditMutation.error)}
              </AlertDescription>
            </Alert>
          ) : null}
          <DataTable
            data={credits}
            columns={creditColumns}
            searchPlaceholder="Search credits"
            searchSubmitLabel="Search"
            pagination={{ enabled: true }}
            emptyState={
              isLoading
                ? "Fetching credits\u2026"
                : "No credit on account \u2014 every payment so far has settled a bill exactly."
            }
          />
        </div>

        <div className={activeView === "refunds" ? "space-y-2" : "hidden"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-section-title">Refunds</h2>
          </div>
          {payRefundMutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>The refund could not be paid</AlertTitle>
              <AlertDescription>
                {getApiErrorMessage(payRefundMutation.error)}
              </AlertDescription>
            </Alert>
          ) : null}
          <DataTable
            data={refunds}
            columns={refundColumns}
            searchPlaceholder="Search refunds"
            searchSubmitLabel="Search"
            pagination={{ enabled: true }}
            emptyState={
              isLoading
                ? "Fetching refunds\u2026"
                : "No refunds \u2014 start one from a credit on account."
            }
          />
        </div>

        <div className={activeView === "waivers" ? "space-y-2" : "hidden"}>
          <h2 className="text-section-title">Fee Waivers</h2>
          <DataTable
            data={waivers}
            columns={waiverColumns}
            searchPlaceholder="Search waivers"
            searchSubmitLabel="Search"
            pagination={{ enabled: true }}
            emptyState={isLoading ? "Loading fee waivers..." : "No fee waivers found."}
          />
        </div>

        <div className={activeView === "structures" ? "space-y-2" : "hidden"}>
          <h2 className="text-section-title">Fee Structures</h2>
          <p className="text-sm text-[var(--text-muted)]">
            A school opens with one fee sheet on the first year group. Copy it up the
            ladder rather than re-typing it — the copies arrive as drafts.
          </p>
          <DataTable
            data={structures}
            columns={structuresColumns}
            searchPlaceholder="Search fee structures"
            searchSubmitLabel="Search"
            pagination={{ enabled: true }}
            emptyState={isLoading ? "Loading fee structures..." : "No fee structures found."}
          />
        </div>
      </VerticalDataViews>

      <CopyStructureDialog
        structure={copySource}
        open={copySource !== null}
        onOpenChange={(next) => {
          if (!next) setCopySource(null);
        }}
      />

      {/* Create Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={handleInvoiceDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Enter the invoice details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvoiceSubmit} className="space-y-4">
            {createInvoiceMutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{getApiErrorMessage(createInvoiceMutation.error)}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="invoice-studentId" className="text-sm font-medium">
                Student ID <span className="text-destructive">*</span>
              </label>
              <Input
                id="invoice-studentId"
                value={invoiceForm.studentId}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, studentId: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="invoice-termId" className="text-sm font-medium">
                Term ID <span className="text-destructive">*</span>
              </label>
              <Input
                id="invoice-termId"
                value={invoiceForm.termId}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, termId: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="invoice-description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="invoice-description"
                value={invoiceForm.description}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="invoice-amount" className="text-sm font-medium">
                Amount <span className="text-destructive">*</span>
              </label>
              <Input
                id="invoice-amount"
                type="number"
                step="0.01"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleInvoiceDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInvoiceMutation.isPending}>
                {createInvoiceMutation.isPending ? "Saving…" : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={handleReceiptDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Receipt</DialogTitle>
            <DialogDescription>Enter the receipt details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReceiptSubmit} className="space-y-4">
            {createReceiptMutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{getApiErrorMessage(createReceiptMutation.error)}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="receipt-invoiceId" className="text-sm font-medium">
                Invoice ID <span className="text-destructive">*</span>
              </label>
              <Input
                id="receipt-invoiceId"
                value={receiptForm.invoiceId}
                onChange={(e) => setReceiptForm((f) => ({ ...f, invoiceId: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="receipt-amount" className="text-sm font-medium">
                Amount <span className="text-destructive">*</span>
              </label>
              <Input
                id="receipt-amount"
                type="number"
                step="0.01"
                value={receiptForm.amount}
                onChange={(e) => setReceiptForm((f) => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>
            <Select
              id="receipt-method"
              label="Payment method"
              value={receiptForm.method}
              onChange={(e) => setReceiptForm((f) => ({ ...f, method: e.target.value }))}
              required
              hint="A payment larger than the invoice is accepted; the surplus becomes credit on the family's account."
            >
              <option value="">Select method</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </Select>
            <div className="space-y-2">
              <label htmlFor="receipt-reference" className="text-sm font-medium">
                Reference
              </label>
              <Input
                id="receipt-reference"
                value={receiptForm.reference}
                onChange={(e) => setReceiptForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleReceiptDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createReceiptMutation.isPending}>
                {createReceiptMutation.isPending ? "Saving…" : "Record Receipt"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Allocate a receipt's surplus to another invoice — S-2.5's second half.
          The credit that motivated this dialog is named in the description, so
          the bursar is not working from memory. */}
      <Dialog
        open={creditSource !== null}
        onOpenChange={handleAllocateDialogOpenChange}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate credit</DialogTitle>
            <DialogDescription>
              {creditSource
                ? `${formatSchoolMoney(creditSource.available, creditSource.currency)} from ${creditSource.reference}, held for ${creditSource.student.firstName} ${creditSource.student.lastName}.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAllocateSubmit} className="space-y-4">
            {allocateCreditMutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>The credit could not be allocated</AlertTitle>
                <AlertDescription>
                  {getApiErrorMessage(allocateCreditMutation.error)}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="allocate-invoiceId" className="text-sm font-medium">
                Invoice ID <span className="text-destructive">*</span>
              </label>
              <Input
                id="allocate-invoiceId"
                value={allocateForm.invoiceId}
                onChange={(e) =>
                  setAllocateForm((form) => ({ ...form, invoiceId: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="allocate-amount" className="text-sm font-medium">
                Amount
              </label>
              <Input
                id="allocate-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={creditSource?.available ?? undefined}
                value={allocateForm.amount}
                onChange={(e) =>
                  setAllocateForm((form) => ({ ...form, amount: e.target.value }))
                }
                aria-describedby="allocate-amount-help"
              />
              <p id="allocate-amount-help" className="text-xs text-muted-foreground">
                Leave blank to settle as much of the invoice as the credit covers.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAllocateDialogOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={allocateCreditMutation.isPending}>
                {allocateCreditMutation.isPending ? "Allocating…" : "Allocate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ask for money back — S-2.6. Requesting holds the credit; paying is a
          separate act on the refunds view, because handing cash over and
          deciding to hand it over are not the same moment. */}
      <Dialog open={refundSource !== null} onOpenChange={handleRefundDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund credit</DialogTitle>
            <DialogDescription>
              {refundSource
                ? `${formatSchoolMoney(refundSource.available, refundSource.currency)} available from ${refundSource.reference}. Requesting holds it; it is not paid until you settle the refund.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRefundSubmit} className="space-y-4">
            {requestRefundMutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>The refund could not be requested</AlertTitle>
                <AlertDescription>
                  {getApiErrorMessage(requestRefundMutation.error)}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="refund-amount" className="text-sm font-medium">
                Amount <span className="text-destructive">*</span>
              </label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={refundSource?.available ?? undefined}
                value={refundForm.amount}
                onChange={(e) =>
                  setRefundForm((form) => ({ ...form, amount: e.target.value }))
                }
                required
              />
            </div>
            <Select
              id="refund-method"
              label="Method"
              value={refundForm.method}
              onChange={(e) =>
                setRefundForm((form) => ({ ...form, method: e.target.value }))
              }
              required
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </Select>
            <div className="space-y-2">
              <label htmlFor="refund-reason" className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <Input
                id="refund-reason"
                value={refundForm.reason}
                onChange={(e) =>
                  setRefundForm((form) => ({ ...form, reason: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="refund-reference" className="text-sm font-medium">
                Reference
              </label>
              <Input
                id="refund-reference"
                value={refundForm.reference}
                onChange={(e) =>
                  setRefundForm((form) => ({ ...form, reference: e.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRefundDialogOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={requestRefundMutation.isPending}>
                {requestRefundMutation.isPending ? "Requesting…" : "Request refund"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelTarget !== null} onOpenChange={handleCancelDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cancelTarget ? `Cancel refund ${cancelTarget.refundNo}` : "Cancel refund"}
            </DialogTitle>
            <DialogDescription>
              {cancelTarget
                ? `This releases ${formatSchoolMoney(cancelTarget.amount, cancelTarget.currency)} back to the family's credit.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCancelSubmit} className="space-y-4">
            {cancelRefundMutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>The refund could not be cancelled</AlertTitle>
                <AlertDescription>
                  {getApiErrorMessage(cancelRefundMutation.error)}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="cancel-reason" className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <Input
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCancelDialogOpenChange(false)}
              >
                Keep it
              </Button>
              <Button type="submit" disabled={cancelRefundMutation.isPending}>
                {cancelRefundMutation.isPending ? "Cancelling…" : "Cancel refund"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BulkGenerateInvoicesDialog
        open={bulkGenerateDialogOpen}
        onOpenChange={setBulkGenerateDialogOpen}
      />
    </div>
  );
}
