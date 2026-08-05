"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileList, MobileListEmpty } from "@corelithzw/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FilterBar, FilterSelect } from "@/components/schools/common/filter-select";
import { getApiErrorMessage } from "@/lib/api-client";
import { fetchSchoolsClasses } from "@/lib/schools/admin-v2";
import { formatSchoolMoney } from "@/lib/schools/format";
import { fetchSchoolFeeInvoices } from "@/lib/schools/fees-v2";

const STATUS_OPTIONS = [
  { value: "ISSUED", label: "Issued" },
  { value: "PART_PAID", label: "Part paid" },
  { value: "PAID", label: "Paid" },
  { value: "DRAFT", label: "Draft" },
  { value: "WRITEOFF", label: "Written off" },
  { value: "VOIDED", label: "Voided" },
];

type InvoiceStatus = "DRAFT" | "ISSUED" | "PART_PAID" | "PAID" | "VOIDED" | "WRITEOFF";

function statusBadge(status: InvoiceStatus) {
  if (status === "PAID") return <Badge variant="secondary">Paid</Badge>;
  if (status === "PART_PAID") return <Badge variant="outline">Part paid</Badge>;
  if (status === "WRITEOFF") return <Badge variant="destructive">Written off</Badge>;
  if (status === "VOIDED") return <Badge variant="destructive">Voided</Badge>;
  if (status === "DRAFT") return <Badge variant="outline">Draft</Badge>;
  return <Badge variant="outline">Issued</Badge>;
}

/**
 * One year group's fees.
 *
 * A bursar chasing arrears works a form at a time — "who in Form 2 still owes"
 * — not down a list of every invoice in the school. The class filter goes
 * through the student's current class rather than a column on the invoice,
 * because the class belongs to the student and copying it onto the invoice
 * would give two answers the moment a child moves up.
 *
 * The outstanding total leads, because that is the number the conversation is
 * about.
 */
export function ClassFeesContent({
  classId,
  initialStreamId,
}: {
  classId: string;
  initialStreamId?: string;
}) {
  const [streamFilter, setStreamFilter] = useState(initialStreamId ?? "");
  const [statusFilter, setStatusFilter] = useState("");

  const classesQuery = useQuery({
    queryKey: ["schools", "grades"],
    queryFn: () => fetchSchoolsClasses({ page: 1, limit: 200 }),
  });

  const invoicesQuery = useQuery({
    queryKey: ["schools", "fees", "by-class", classId, streamFilter, statusFilter],
    queryFn: () =>
      fetchSchoolFeeInvoices({
        page: 1,
        limit: 200,
        classId,
        streamId: streamFilter || undefined,
        status: (statusFilter || undefined) as InvoiceStatus | undefined,
      }),
  });

  const invoices = useMemo(
    () => invoicesQuery.data?.data ?? [],
    [invoicesQuery.data],
  );
  const schoolClass = useMemo(
    () => (classesQuery.data?.data ?? []).find((row) => row.id === classId) ?? null,
    [classesQuery.data, classId],
  );
  const streams = schoolClass?.streams ?? [];

  const outstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceAmount, 0);
  const owing = invoices.filter((invoice) => invoice.balanceAmount > 0).length;

  if (invoicesQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load invoices</AlertTitle>
        <AlertDescription>{getApiErrorMessage(invoicesQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar>
        {streams.length > 0 ? (
          <FilterSelect
            label="Class"
            allLabel="Every class"
            value={streamFilter}
            options={streams.map((stream) => ({ value: stream.id, label: stream.name }))}
            onChange={setStreamFilter}
          />
        ) : null}
        <FilterSelect
          label="Status"
          allLabel="Any status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={setStatusFilter}
        />
      </FilterBar>

      <p className="text-sm text-muted-foreground">
        <span className="tabular-nums">{formatSchoolMoney(outstanding)}</span> outstanding across{" "}
        {owing} student
        {owing === 1 ? "" : "s"}, from {invoices.length} invoice
        {invoices.length === 1 ? "" : "s"}.
      </p>

      <MobileList>
        {invoices.length === 0 ? (
          <MobileListEmpty>
            {invoicesQuery.isLoading
              ? "Loading invoices…"
              : "No invoices for this year group yet."}
          </MobileListEmpty>
        ) : (
          invoices.map((invoice) => (
            <MobileList.Row
              key={invoice.id}
              static
              title={`${invoice.student.lastName}, ${invoice.student.firstName}`}
              subtitle={
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  <span>
                    {invoice.invoiceNo} · {invoice.term.name} ·{" "}
                    <span className="tabular-nums">
                      {formatSchoolMoney(invoice.totalAmount, invoice.currency)}
                    </span>{" "}
                    billed
                    {invoice.balanceAmount > 0
                      ? ` · ${formatSchoolMoney(invoice.balanceAmount, invoice.currency)} outstanding`
                      : ""}
                  </span>
                  {statusBadge(invoice.status)}
                </span>
              }
            />
          ))
        )}
      </MobileList>
    </div>
  );
}
