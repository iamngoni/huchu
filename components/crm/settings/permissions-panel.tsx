"use client";

import { Check, X } from "@/lib/icons";
import { permissionMatrix } from "@/lib/crm/permissions";

/**
 * The permission table, read straight from the same source the API gates on.
 *
 * Showing it here means the answer to "why can't I do this?" is a page
 * somebody can read rather than a 403 and a guess. It is deliberately not
 * editable: per-tenant permission editing is a support burden nobody here has
 * asked for, and two roles that everyone understands beat twelve that nobody
 * does.
 */
export function PermissionsPanel() {
  const rows = permissionMatrix();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Who can do what</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Everyone in the CRM sees the whole pipeline. What differs is what they
          can change. Change somebody&apos;s role in User Management to move
          them between these columns.
        </p>
      </div>

      <div className="overflow-hidden rounded-[var(--card-radius)] border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-subtle)] text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Permission</th>
              <th className="w-32 px-3 py-2 text-center font-medium">Manager</th>
              <th className="w-32 px-3 py-2 text-center font-medium">Sales rep</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.capability} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-2">{row.label}</td>
                <td className="px-3 py-2 text-center">
                  <Allowed value={row.manager} />
                </td>
                <td className="px-3 py-2 text-center">
                  <Allowed value={row.rep} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        A rep may also claim an unassigned record, which is what makes
        &ldquo;edit records assigned to them&rdquo; workable in practice.
      </p>
    </div>
  );
}

function Allowed({ value }: { value: boolean }) {
  return value ? (
    <Check className="mx-auto size-4 text-[var(--status-success-text)]" aria-label="Allowed" />
  ) : (
    <X className="mx-auto size-4 text-[var(--text-muted)]" aria-label="Not allowed" />
  );
}
