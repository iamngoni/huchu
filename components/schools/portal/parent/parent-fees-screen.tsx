"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PersonAvatar } from "@/components/schools/common/person-avatar";
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
 * second opinion about what a family owes. The one figure the sticky bar shows is
 * the loader's own outstanding balance, not a sum of the rows above it.
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
  const { child, term } = useParentPortal();
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
    return (
      <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No child selected.</p>
    );
  }

  if (!child.canSeeFees) {
    return (
      <div className="p-4">
        <Alert>
          <AlertTitle>Fees are not shown on your account</AlertTitle>
          <AlertDescription>
            The school has set your account up without financial access for {child.firstName}. The
            office can change that.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (query.isPending) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Fees could not be loaded</AlertTitle>
          <AlertDescription>{getApiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const invoices = query.data?.invoices ?? [];
  const receipts = query.data?.receipts ?? [];
  const fees = child.fees;
  const currency = invoices[0]?.currency ?? fees?.currency ?? "USD";
  const outstanding = Number(fees?.outstanding ?? 0);
  const overdue = Number(fees?.overdue ?? 0);
  const billed = Number(fees?.billed ?? 0);
  const paid = Number(fees?.paid ?? 0);
  const paidPct = billed > 0 ? Math.max(0, Math.min(100, Math.round((paid / billed) * 100))) : 0;
  const issued = invoices[0]?.issueDate ?? null;

  return (
    <div className="pp-page">
      {/* Whose bill this is. A parent of three reading a figure needs the name
          beside it more than they need it anywhere else in the app. */}
      <div className="flex items-center gap-[10px] px-4 pb-[6px] pt-[14px]">
        <PersonAvatar
          firstName={child.firstName}
          lastName={child.lastName}
          src={child.avatarUrl}
          size="sm"
        />
        <div className="min-w-0">
          <div className="text-[14px] font-medium leading-[1.3] text-[var(--text-strong)]">
            {child.firstName} {child.lastName}
          </div>
          <div className="truncate text-[12px] leading-[1.3] text-[var(--text-muted)]">
            {[child.currentClass?.name, child.currentStream?.name].filter(Boolean).join(" · ") ||
              "No class yet"}
          </div>
        </div>
      </div>

      <div className="b-stat-hero">
        <div className="b-sh-lead">
          <div className="b-sh-l">What you still owe</div>
          <div className="b-sh-v">{formatSchoolMoney(outstanding, currency)}</div>
          <div className="b-sh-d">
            {outstanding === 0
              ? `All paid for ${term?.name ?? "this term"} — thank you.`
              : overdue > 0
                ? `${formatSchoolMoney(overdue, currency)} of this is past its due date.`
                : fees?.nextDueDate
                  ? `${term?.name ?? "This term"} fees · pay by ${formatSchoolDate(fees.nextDueDate)}`
                  : `Across ${fees?.invoices ?? invoices.length} bills.`}
          </div>
          {billed > 0 ? (
            <div className="fh-progress">
              <div className="bar">
                <span style={{ width: `${paidPct}%` }} />
              </div>
              <div className="meta">
                <span>Paid · {formatSchoolMoney(paid, currency)}</span>
                <span>Total · {formatSchoolMoney(billed, currency)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="section-h">
        Fee statement
        {issued ? <span className="mono-note">Sent {formatSchoolDate(issued)}</span> : null}
      </div>
      {invoices.length === 0 ? (
        <div className="breakdown">
          <p className="pp-empty-row">Nothing has been billed to {child.firstName} yet.</p>
        </div>
      ) : (
        <div className="breakdown">
          {invoices.map((invoice) => {
            const expanded = open === invoice.id;
            return (
              <div key={invoice.id}>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : invoice.id)}
                  aria-expanded={expanded}
                  className="breakdown-row w-full cursor-pointer text-left"
                >
                  <span>
                    <span className="nm block">{invoice.term?.name ?? "Fees"}</span>
                    <span className="sb block">
                      {invoice.invoiceNo} · due {formatSchoolDate(invoice.dueDate)}
                    </span>
                  </span>
                  <span className="v">
                    {formatSchoolMoney(Number(invoice.balance), invoice.currency)}
                  </span>
                </button>

                {expanded ? (
                  <>
                    {/* What the money is for. The whole reason this screen exists. */}
                    {invoice.lines.map((line) => (
                      <div key={line.id} className="breakdown-row">
                        <span>
                          <span className="nm block">{line.description}</span>
                          <span className="sb block">{line.feeCode}</span>
                        </span>
                        <span className="v">
                          {formatSchoolMoney(Number(line.amount), invoice.currency)}
                        </span>
                      </div>
                    ))}
                    <div className="breakdown-row paid">
                      <span>
                        <span className="nm block">Already paid</span>
                        <span className="sb block">Against {invoice.invoiceNo}</span>
                      </span>
                      <span className="v">
                        {formatSchoolMoney(Number(invoice.paid), invoice.currency)}
                      </span>
                    </div>
                    <div className="px-[14px] py-3">
                      <PrintDocumentButton
                        sourceKey="schools.fee.invoice"
                        recordId={invoice.id}
                        label="Download this bill"
                      />
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
          {/* The term's own total, from the ledger's figures rather than a sum of
              the rows a parent happens to have expanded. */}
          {billed > 0 ? (
            <div className="breakdown-row total">
              <span>
                <span className="nm block">Total for the term</span>
                <span className="sb block">
                  {term?.name ?? "This term"} · everything added up
                </span>
              </span>
              <span className="v">{formatSchoolMoney(billed, currency)}</span>
            </div>
          ) : null}
        </div>
      )}

      <div className="section-h">
        Payments you have made
        {receipts.length > 0 ? (
          <span className="mono-note">
            {receipts.length} {receipts.length === 1 ? "receipt" : "receipts"}
          </span>
        ) : null}
      </div>
      <div className="card-block boxed">
        {receipts.length === 0 ? (
          <p className="pp-empty-row">No payments recorded yet.</p>
        ) : (
          receipts.map((receipt) => (
            <div key={receipt.id} className="pl-row">
              <div className="min-w-0 flex-1">
                <div className="nm">
                  {formatSchoolMoney(Number(receipt.amount), receipt.currency)}
                </div>
                <div className="sb">
                  {formatSchoolDate(receipt.receiptDate)} ·{" "}
                  {receipt.method.replace(/_/g, " ").toLowerCase()}
                  {receipt.reference ? ` · ${receipt.reference}` : ""}
                </div>
              </div>
              {/* S-6.7 — the receipt itself, as a file they can keep. */}
              <PrintDocumentButton
                sourceKey="schools.fee.receipt"
                recordId={receipt.id}
                label="Receipt"
              />
            </div>
          ))
        )}
      </div>

      {/* The statement, as paper. There is no payment flow in this portal, so the
          sticky bar's action is the one thing a parent can actually do here. */}
      <div className="pay-bar">
        <div className="meta">
          <div className="l">What you still owe</div>
          <div className="v">{formatSchoolMoney(outstanding, currency)}</div>
        </div>
        <PrintDocumentButton
          sourceKey="schools.fee.statement"
          recordId={child.id}
          label="Statement"
          variant="default"
        />
      </div>
    </div>
  );
}
