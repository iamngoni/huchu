"use client";

import * as React from "react";

type ApprovalDoc = {
  companyName: string;
  documentType: "QUOTATION" | "INVOICE" | "RECEIPT";
  status: string;
  number: string;
  currency: string;
  total: number;
  lines: Array<{ description: string; quantity: number; unitPrice: number; lineTotal: number }>;
  expired: boolean;
};

function money(currency: string, value: number): string {
  return `${currency} ${value.toFixed(2)}`;
}

export function ApprovalContent({ token }: { token: string }) {
  const [doc, setDoc] = React.useState<ApprovalDoc | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState("");
  const [note, setNote] = React.useState("");
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch(`/api/public/crm/approvals/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!active) return;
        if (!res.ok || !data.ok) setLoadError(data.error ?? "Document not found.");
        else setDoc(data.document as ApprovalDoc);
      })
      .catch(() => active && setLoadError("Document not found."));
    return () => {
      active = false;
    };
  }, [token]);

  async function respond(action: "APPROVE" | "DECLINE") {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/crm/approvals/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, name: name || undefined, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) setError(data.error ?? "Could not record your response.");
      else setResult(data.status);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) return <Card>{loadError}</Card>;
  if (!doc) return <Card>Loading…</Card>;

  const alreadyResolved = doc.status !== "PENDING" || Boolean(result);
  const finalStatus = result ?? doc.status;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-neutral-500">{doc.companyName}</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
          {doc.documentType === "QUOTATION" ? "Quotation" : doc.documentType === "INVOICE" ? "Invoice" : "Receipt"}{" "}
          {doc.number}
        </h1>

        {doc.expired ? null : (
          <>
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((line, index) => (
              <tr key={index} className="border-b border-neutral-100">
                <td className="py-2 text-neutral-800">{line.description}</td>
                <td className="py-2 text-right text-neutral-600">{line.quantity}</td>
                <td className="py-2 text-right text-neutral-600">{money(doc.currency, line.unitPrice)}</td>
                <td className="py-2 text-right text-neutral-800">{money(doc.currency, line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex justify-end text-lg font-semibold text-neutral-900">
          {money(doc.currency, doc.total)}
        </div>
          </>
        )}

        {alreadyResolved ? (
          <div className="mt-6 rounded-lg bg-neutral-50 p-4 text-center text-neutral-700">
            This document is <strong>{finalStatus}</strong>.
          </div>
        ) : doc.expired ? (
          <div className="mt-6 rounded-lg bg-neutral-50 p-4 text-center text-neutral-700">This link has expired.</div>
        ) : (
          <div className="mt-6 space-y-3">
            <input
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
              rows={2}
              placeholder="Add a note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-3">
              <button
                disabled={submitting}
                onClick={() => respond("APPROVE")}
                className="flex-1 rounded-xl bg-neutral-900 px-4 py-3 font-medium text-white disabled:opacity-60"
              >
                Approve
              </button>
              <button
                disabled={submitting}
                onClick={() => respond("DECLINE")}
                className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 font-medium text-neutral-800 disabled:opacity-60"
              >
                Decline
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">{children}</div>
    </div>
  );
}
