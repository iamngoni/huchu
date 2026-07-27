import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { LeadsWorkspace } from "@/components/crm/leads/leads-workspace";
import { parseLeadFiltersFromParams } from "@/lib/crm/views";
import { authOptions } from "@/lib/auth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CrmLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // Filters come in through the URL so links from the dashboard, insights, and
  // anywhere else can point at a specific slice of the pipeline.
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0]) params.set(key, value.join(","));
  }
  const view = params.get("view") === "board" ? "BOARD" : "TABLE";

  return (
    <div className="mx-auto w-full max-w-[110rem] space-y-6">
      <PageHeading title="Leads & Pipeline" />
      <LeadsWorkspace
        initialFilters={parseLeadFiltersFromParams(params)}
        initialView={view}
      />
    </div>
  );
}
