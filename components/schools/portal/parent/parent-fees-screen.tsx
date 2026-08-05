"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PrintDocumentButton } from "@/components/schools/common/print-document-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { formatSchoolDate, formatSchoolMoney } from "@/lib/schools/format";

import { useParentPortal } from "./parent-portal-context";

/**
 * S-6.6 / S-6.7 / S-6.8 — what is owed, what it is for, and the paper for it.
 *
 * Lines, not one total. "Fees: $450" is a figure a parent cannot check; "Tuition
 * 380 · Sports 25 · Books 45" is one they can, and it is the difference between a
 * bill they pay and a bill they ring the office about.
 *
 * Amounts arrive as strings and are formatted, never summed here: the balance a
 * parent is shown is the one the ledger computed, and a client-side subtotal is a
 * second opinion about what a family owes.
 */

type FeeLine = { id: string; feeCode: string; description: string; amount: string };

type Invoice = {
  id: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  status: string;
  currency: string;
  total: string;
  paid: string;
  balance: string;
  term: { id: string; name: string } | null;
  lines: FeeLine[];
};

type Receipt = {
  id: string;
  receiptNo: string;
  receiptDate: string;
  method: string;
  reference: string | null;
  currency: string;
  amount: string;
};

export function ParentFeesScreen() {
  const { child } = useParentPortal();
  const [open, setOpen] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["portal", "parent", "fees", child?.id],
    queryFn: () =>
      fetchJson<{ invoices: Invoice[]; receipts: Receipt[] }>(
        `/api/v2/schools/portal/parent/child/fees?childId=${child!.id}`,
      ),
    enabled: Boolean(child?.id),
  });

  if (!child) {
    return <p className="py-8 text-center text-sm text-[var(--text-muted)]">No child selected.</p>;
  }

  if (!child.canSeeFees) {
    return (
      <Alert>
        <AlertTitle>Fees are not shown on your account</AlertTitle>
        <AlertDescription>
          The school has set your account up without financial access for {child.firstName}. The
          office can change that.
        </AlertDescription>
      </Alert>
    );
  }

  if (query.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Fees could not be loaded</AlertTitle>
        <AlertDescription>{getApiErrorMessage(query.error)}</AlertDescription>
      </Alert>
    );
  }

  const invoices = query.data?.invoices ?? [];
  const receipts = query.data?.receipts ?? [];
  const currency = invoices[0]?.currency ?? child.fees?.currency ?? "USD";

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
        <p className="text-sm text-[var(--text-muted)]">What you still owe</p>
        <p className="text-3xl font-semibold tabular-nums">
          {formatSchoolMoney(Number(child.fees?.outstanding ?? 0), currency)}
        </p>
        {Number(child.fees?.overdue ?? 0) > 0 ? (
          <p className="mt-1 text-sm text-[var(--status-error-text)]">
            {formatSchoolMoney(Number(child.fees?.overdue ?? 0), currency)} is past its due date.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <PrintDocumentButton
            sourceKey="schools.fee.statement"
            recordId={child.id}
            label="Download statement"
          />
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--text-subtle)]">
          Bills
        </h2>
        {invoices.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">
            Nothing has been billed to {child.firstName} yet.
          </p>
        ) : (
          invoices.map((invoice) => {
            const expanded = open === invoice.id;
            return (
              <div
                key={invoice.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)]"
              >
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : invoice.id)}
                  aria-expanded={expanded}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{invoice.term?.name ?? "Fees"}</span>
                    <span className="block text-sm text-[var(--text-muted)]">
                      {invoice.invoiceNo} · due {formatSchoolDate(invoice.dueDate)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold tabular-nums">
                      {formatSchoolMoney(Number(invoice.balance), invoice.currency)}
                    </span>
                    <span className="block text-sm text-[var(--text-muted)]">
                      {Number(invoice.balance) === 0
                        ? "Settled"
                        : `of ${formatSchoolMoney(Number(invoice.total), invoice.currency)}`}
                    </span>
                  </span>
                </button>

                {expanded ? (
                  <div className="space-y-1 border-t border-[var(--border-subtle)] p-4">
                    {/* What the money is for. The whole reason this screen exists. */}
                    {invoice.lines.map((line) => (
                      <div key={line.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-[var(--text-muted)]">{line.description}</span>
                        <span className="tabular-nums">
                          {formatSchoolMoney(Number(line.amount), invoice.currency)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-baseline justify-between gap-3 pt-2 text-sm font-medium">
                      <span>Paid so far</span>
                      <span className="tabular-nums">
                        {formatSchoolMoney(Number(invoice.paid), invoice.currency)}
                      </span>
                    </div>
                    <div className="pt-2">
                      <PrintDocumentButton
                        sourceKey="schools.fee.invoice"
                        recordId={invoice.id}
                        label="Download this bill"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--text-subtle)]">
          Payments you have made
        </h2>
        {receipts.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">
            No payments recorded yet.
          </p>
        ) : (
          receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4"
            >
              <span className="min-w-0">
                <span className="block font-medium tabular-nums">
                  {formatSchoolMoney(Number(receipt.amount), receipt.currency)}
                </span>
                <span className="block text-sm text-[var(--text-muted)]">
                  {formatSchoolDate(receipt.receiptDate)} ·{" "}
                  {receipt.method.replace(/_/g, " ").toLowerCase()}
                  {receipt.reference ? ` · ${receipt.reference}` : ""}
                </span>
              </span>
              {/* S-6.7 — the receipt itself, as a file they can keep. */}
              <PrintDocumentButton
                sourceKey="schools.fee.receipt"
                recordId={receipt.id}
                label="Receipt"
              />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
