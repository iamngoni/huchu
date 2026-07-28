"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecordDialog } from "@/components/crm/records/record-dialog";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { Plus, Trash2 } from "@/lib/icons";
import type { CrmDocumentLineInput } from "@/lib/crm/accounting-bridge";

import {
  draftToLine,
  emptyLine,
  lineTotals,
  round2,
  toNumber,
  type DocumentLineDraft,
} from "./document-math";
import { formatMoney } from "./document-types";

export function DocumentBuilderSheet({
  open,
  onOpenChange,
  basePath,
  mode,
  currency,
  prefillLines,
  fromQuotationId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The record's API base, e.g. /api/v2/crm/deals/<id>. */
  basePath: string;
  mode: "quotation" | "invoice";
  currency: string;
  prefillLines?: CrmDocumentLineInput[];
  fromQuotationId?: string;
  onCreated?: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [lines, setLines] = useState<DocumentLineDraft[]>([emptyLine()]);
  const [documentDiscount, setDocumentDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sendApproval, setSendApproval] = useState(mode === "quotation");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setLines(
      prefillLines && prefillLines.length > 0
        ? prefillLines.map((line) => ({
            description: line.description,
            quantity: String(line.quantity),
            unitPrice: line.unitPrice ? String(line.unitPrice) : "",
            discountPercent: "",
            taxRate: line.taxRate ? String(line.taxRate) : "",
          }))
        : [emptyLine()],
    );
    setDocumentDiscount("");
    setNotes("");
    setValidUntil("");
    setDueDate("");
    setSendApproval(mode === "quotation");
    setErrors([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totals = useMemo(
    () => lineTotals(lines, toNumber(documentDiscount)),
    [lines, documentDiscount],
  );

  const patchLine = (index: number, patch: Partial<DocumentLineDraft>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const create = useMutation({
    mutationFn: () => {
      const docDiscount = toNumber(documentDiscount);
      const payload = lines
        .map((line) => draftToLine(line, docDiscount))
        .filter(Boolean) as CrmDocumentLineInput[];

      // The discount is spread across the lines, so say so in the notes —
      // otherwise the client just sees prices they can't reconcile.
      const noteParts = [notes.trim()].filter(Boolean);
      if (docDiscount > 0) {
        noteParts.push(`A ${docDiscount}% discount has been applied across all lines.`);
      }

      const endpoint = mode === "quotation" ? "quotation" : "invoice";
      return fetchJson<{ total?: number }>(
        `${basePath}/${endpoint}`,
        {
          method: "POST",
          body: JSON.stringify({
            ...(fromQuotationId ? { fromQuotationId } : { lines: payload }),
            currency,
            notes: noteParts.join(" ") || undefined,
            ...(mode === "quotation"
              ? {
                  validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
                  sendApproval,
                }
              : { dueDate: dueDate ? new Date(dueDate).toISOString() : undefined }),
          }),
        },
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["crm-record", basePath] });
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "board"] });
      toast({
        title: mode === "quotation" ? "Quotation created" : "Invoice issued",
        // Report the server's total, not the preview — per-line rounding can
        // put the two a cent apart, and money should never look uncertain.
        description:
          typeof result.total === "number"
            ? formatMoney(result.total, currency)
            : undefined,
      });
      onOpenChange(false);
      onCreated?.();
    },
    onError: (error) => setErrors([getApiErrorMessage(error)]),
  });

  const validate = (): string[] => {
    if (fromQuotationId) return [];
    const found: string[] = [];
    const valid = lines.map(draftToLine).filter(Boolean);
    if (valid.length === 0) {
      found.push("Add at least one line with a description and a quantity above zero.");
    }
    if (lines.some((line) => line.description.trim() && !line.unitPrice.trim())) {
      found.push("Every line needs a unit price — use 0 for items you're including free.");
    }
    if (totals.total < 0) {
      found.push("The document total can't be negative. Check your discounts.");
    }
    return found;
  };

  const isQuotation = mode === "quotation";

  return (
    <RecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isQuotation ? "New quotation" : "New invoice"}
      description={fromQuotationId
      ? "Converting the accepted quotation — the lines carry over exactly as quoted."
      : isQuotation
        ? "Price up the work. The client can approve it from a link without signing in."
        : "Bill the work. Payments recorded against this invoice produce receipts."}
      size="xl"
      errors={errors}
      onSubmit={(event) => {
        event.preventDefault();
        const found = validate();
        setErrors(found);
        if (found.length === 0) create.mutate();
      }}
      footer={<>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending
            ? "Saving…"
            : isQuotation
              ? sendApproval
                ? "Create & share"
                : "Create quotation"
              : "Issue invoice"}
        </Button>
      </>}
    >
      {fromQuotationId ? (
        <p className="rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3 text-sm">
          Lines are taken from the source quotation and can&apos;t be edited here — that keeps
          the invoice matching what the client accepted. Cancel and start a fresh invoice if
          the scope has changed.
        </p>
      ) : (
        <section className="space-y-3">
          <div className="hidden gap-2 px-1 text-sm font-medium text-[var(--text-muted)] sm:grid sm:grid-cols-[minmax(0,1fr)_5rem_7rem_5rem_5rem_7rem_2rem]">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Disc %</span>
            <span className="text-right">Tax %</span>
            <span className="text-right">Line total</span>
            <span />
          </div>

          {lines.map((line, index) => {
            const quantity = toNumber(line.quantity, 1);
            const listPrice = toNumber(line.unitPrice);
            const discount = Math.min(Math.max(toNumber(line.discountPercent), 0), 100);
            const net = round2(quantity * round2(listPrice * (1 - discount / 100)));

            return (
              <div
                key={index}
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_5rem_5rem_7rem_2rem] sm:items-center"
              >
                <Input
                  value={line.description}
                  onChange={(event) => patchLine(index, { description: event.target.value })}
                  placeholder="What are you charging for?"
                  aria-label={`Line ${index + 1} description`}
                  maxLength={300}
                />
                <Input
                  value={line.quantity}
                  onChange={(event) => patchLine(index, { quantity: event.target.value })}
                  inputMode="decimal"
                  className="text-right font-mono"
                  aria-label={`Line ${index + 1} quantity`}
                />
                <Input
                  value={line.unitPrice}
                  onChange={(event) => patchLine(index, { unitPrice: event.target.value })}
                  inputMode="decimal"
                  className="text-right font-mono"
                  placeholder="0.00"
                  aria-label={`Line ${index + 1} unit price`}
                />
                <Input
                  value={line.discountPercent}
                  onChange={(event) =>
                    patchLine(index, { discountPercent: event.target.value })
                  }
                  inputMode="decimal"
                  className="text-right font-mono"
                  placeholder="0"
                  aria-label={`Line ${index + 1} discount percent`}
                />
                <Input
                  value={line.taxRate}
                  onChange={(event) => patchLine(index, { taxRate: event.target.value })}
                  inputMode="decimal"
                  className="text-right font-mono"
                  placeholder="0"
                  aria-label={`Line ${index + 1} tax percent`}
                />
                <span className="px-1 text-right font-mono text-sm tabular-nums">
                  {net.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 px-0"
                  aria-label={`Remove line ${index + 1}`}
                  disabled={lines.length === 1}
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <Plus className="h-3.5 w-3.5" />
            Add line
          </Button>
        </section>
      )}

      {!fromQuotationId ? (
        <section className="ml-auto w-full max-w-sm space-y-1.5 rounded-[var(--card-radius)] border border-[var(--border)] p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">List total</span>
            <span className="font-mono tabular-nums">
              {formatMoney(totals.listTotal, currency)}
            </span>
          </div>
          {totals.lineDiscount > 0 ? (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Line discounts</span>
              <span className="font-mono tabular-nums">
                −{formatMoney(totals.lineDiscount, currency)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="doc-discount" className="text-[var(--text-muted)]">
              Document discount %
            </Label>
            <Input
              id="doc-discount"
              value={documentDiscount}
              onChange={(event) => setDocumentDiscount(event.target.value)}
              inputMode="decimal"
              className="h-8 w-20 text-right font-mono"
              placeholder="0"
            />
          </div>
          {totals.docDiscountAmount > 0 ? (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Document discount</span>
              <span className="font-mono tabular-nums">
                −{formatMoney(totals.docDiscountAmount, currency)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Subtotal</span>
            <span className="font-mono tabular-nums">
              {formatMoney(totals.subTotal, currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Tax</span>
            <span className="font-mono tabular-nums">
              {formatMoney(totals.taxTotal, currency)}
            </span>
          </div>
          <div className="flex justify-between border-t border-[var(--border)] pt-1.5 text-base font-semibold">
            <span>Total</span>
            <span className="font-mono tabular-nums">
              {formatMoney(totals.total, currency)}
            </span>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="doc-date">{isQuotation ? "Valid until" : "Due date"}</Label>
          <Input
            id="doc-date"
            type="date"
            value={isQuotation ? validUntil : dueDate}
            onChange={(event) =>
              isQuotation ? setValidUntil(event.target.value) : setDueDate(event.target.value)
            }
          />
        </div>
      </section>

      <div className="space-y-1.5">
        <Label htmlFor="doc-notes">Notes</Label>
        <Textarea
          id="doc-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Terms, lead times, exclusions — anything the client should read."
        />
      </div>

      {isQuotation ? (
        <label className="flex cursor-pointer items-start gap-2.5">
          <Checkbox
            checked={sendApproval}
            onCheckedChange={(checked) => setSendApproval(checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm">
            Create an approval link
            <span className="block text-[var(--text-muted)]">
              The client can accept or decline from the link without an account.
            </span>
          </span>
        </label>
      ) : null}
    </RecordDialog>
  );
}
