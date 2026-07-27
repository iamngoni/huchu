"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { StatusChip } from "@/components/ui/status-chip";
import { ClientDate } from "@/components/ui/client-date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { Download, DotsThree, FileText, Plus, ReceiptLong } from "@/lib/icons";

import { DocumentBuilderSheet } from "./document-builder-sheet";
import { RecordPaymentSheet } from "./record-payment-sheet";
import {
  DOCUMENT_KIND_LABELS,
  documentNumber,
  documentStatus,
  formatMoney,
  invoiceOutstanding,
  type LeadDocument,
} from "./document-types";

function KindIcon({ type }: { type: LeadDocument["type"] }) {
  const Icon = type === "RECEIPT" ? ReceiptLong : FileText;
  return <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />;
}

export function DocumentList({
  basePath,
  currency,
  documents,
  canCreate,
  prefillLines,
  onPrefillConsumed,
}: {
  /** The record's API base, e.g. /api/v2/crm/deals/<id>. */
  basePath: string;
  currency: string;
  documents: LeadDocument[];
  canCreate: boolean;
  prefillLines?: Parameters<typeof DocumentBuilderSheet>[0]["prefillLines"];
  onPrefillConsumed?: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [builder, setBuilder] = useState<{
    mode: "quotation" | "invoice";
    fromQuotationId?: string;
  } | null>(null);
  const [paymentFor, setPaymentFor] = useState<LeadDocument | null>(null);

  const shareApproval = useMutation({
    mutationFn: (docId: string) =>
      // `{ token, path }`, bare. `successResponse` adds no envelope of its
      // own, and declaring one here is why sharing a quote produced a link
      // ending in `/undefined` — a lie the compiler accepted, surfacing only
      // when a customer clicked it.
      fetchJson<{ token: string; path: string }>(
        `${basePath}/documents/${docId}/approval`,
        { method: "POST", body: JSON.stringify({}) },
      ),
    onSuccess: async (result) => {
      const url = `${window.location.origin}${result.path}`;
      try {
        await navigator.clipboard?.writeText(url);
        toast({ title: "Approval link copied", description: url });
      } catch {
        // Clipboard is blocked in some browsers without a user gesture chain;
        // showing the link is still useful.
        toast({ title: "Approval link ready", description: url });
      }
      queryClient.invalidateQueries({ queryKey: ["crm-record", basePath] });
    },
    onError: (error) =>
      toast({
        title: "Could not create the approval link",
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-3">
      {canCreate ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => setBuilder({ mode: "quotation" })}>
            <Plus className="h-3.5 w-3.5" />
            New quotation
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setBuilder({ mode: "invoice" })}
          >
            <Plus className="h-3.5 w-3.5" />
            New invoice
          </Button>
        </div>
      ) : (
        <p className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3 text-sm text-[var(--text-muted)]">
          Attach a company to this record before quoting or invoicing — documents are billed
          to a customer.
        </p>
      )}

      {documents.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No documents yet</EmptyTitle>
            <EmptyDescription>
              Quotations, invoices, and receipts raised here will appear in this list.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-[var(--card-radius)] border border-[var(--border)]">
          {documents.map((doc) => {
            const status = documentStatus(doc);
            const outstanding = doc.invoice ? invoiceOutstanding(doc.invoice) : 0;
            const canPay = doc.type === "INVOICE" && outstanding > 0;
            const canConvert =
              doc.type === "QUOTATION" &&
              Boolean(doc.quotationId) &&
              status.label !== "Declined" &&
              status.label !== "Voided";

            return (
              <li key={doc.id} className="flex flex-wrap items-center gap-3 p-3">
                <KindIcon type={doc.type} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm">{documentNumber(doc)}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {DOCUMENT_KIND_LABELS[doc.type]}
                    </span>
                    {doc.version > 1 ? (
                      <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]">
                        v{doc.version}
                      </span>
                    ) : null}
                    <StatusChip status={status.status} label={status.label} />
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    <ClientDate value={doc.createdAt} mode="date" />
                    {canPay ? ` · ${formatMoney(outstanding, doc.currency)} outstanding` : ""}
                    {doc.revisionNote ? ` · ${doc.revisionNote}` : ""}
                  </div>
                </div>

                <span className="font-mono text-sm tabular-nums">
                  {formatMoney(doc.amount, doc.currency)}
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 px-0"
                      aria-label={`Actions for ${documentNumber(doc)}`}
                    >
                      <DotsThree className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a
                        href={`${basePath}/documents/${doc.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        View PDF
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href={`${basePath}/documents/${doc.id}/pdf?download=1`}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </a>
                    </DropdownMenuItem>

                    {doc.type !== "RECEIPT" ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => shareApproval.mutate(doc.id)}>
                          {doc.approval ? "Copy approval link" : "Send for approval"}
                        </DropdownMenuItem>
                      </>
                    ) : null}

                    {canConvert ? (
                      <DropdownMenuItem
                        onClick={() =>
                          setBuilder({
                            mode: "invoice",
                            fromQuotationId: doc.quotationId ?? undefined,
                          })
                        }
                      >
                        Convert to invoice
                      </DropdownMenuItem>
                    ) : null}

                    {canPay ? (
                      <DropdownMenuItem onClick={() => setPaymentFor(doc)}>
                        Record payment
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <DocumentBuilderSheet
        open={Boolean(builder)}
        onOpenChange={(next) => {
          if (!next) {
            setBuilder(null);
            onPrefillConsumed?.();
          }
        }}
        basePath={basePath}
        mode={builder?.mode ?? "quotation"}
        currency={currency}
        fromQuotationId={builder?.fromQuotationId}
        prefillLines={builder?.fromQuotationId ? undefined : prefillLines}
      />

      <RecordPaymentSheet
        open={Boolean(paymentFor)}
        onOpenChange={(next) => (!next ? setPaymentFor(null) : undefined)}
        basePath={basePath}
        document={paymentFor}
      />
    </div>
  );
}
