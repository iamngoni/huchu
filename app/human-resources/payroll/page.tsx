import { redirect } from "next/navigation"

/**
 * Payroll's front door.
 *
 * This used to be a router. It read the session's workspace profile to decide
 * whether a gold mine should land on the gold settlement screen instead, and when
 * given a `runId` or an `adjustmentId` it queried `PayrollRun.domain` to work out
 * which of the two screens owned that record. Two database reads to answer a
 * question that only existed because settlements were pretending to be payroll.
 *
 * Settlements have their own screens now, so there is one payroll screen and
 * nothing to route. The redirect stays only because the salary path is where the
 * screen lives; it collapses when the payroll routes move under `/payroll` in the
 * information-architecture split.
 */

type SearchParams = Record<string, string | string[] | undefined>

export default async function PayrollRootPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolved = await searchParams
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(resolved)) {
    if (!value) continue
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry)
    } else {
      params.set(key, value)
    }
  }

  const query = params.toString()
  redirect(query ? `/human-resources/payroll/salary?${query}` : "/human-resources/payroll/salary")
}
