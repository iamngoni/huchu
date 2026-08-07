import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { PageHeading } from "@/components/layout/page-heading";
import { SchoolsFeesContent } from "@/components/schools/fees/schools-fees-content";
import { authOptions } from "@/lib/auth";

/**
 * The whole-school ledger: structures, invoices, receipts, credits, refunds and
 * waivers.
 *
 * S-4.6 made `/schools/finance` a year-group picker, because chasing arrears is
 * work a bursar does one form at a time. This is the other half of their job —
 * "every receipt this week", "which structures are still draft" — which is not
 * about a year group at all, and forcing it through one would be worse than the
 * single list it replaced.
 */
export default async function SchoolsFinanceLedgerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Fee ledger" />
      <SchoolsFeesContent />
    </div>
  );
}
