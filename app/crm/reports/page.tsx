import { getServerSession } from "next-auth";
import { CrmPage } from "@/components/crm/crm-page";
import { redirect } from "next/navigation";

import { PageHeading } from "@/components/layout/page-heading";
import { ReportsContent } from "@/components/crm/reports/reports-content";
import { authOptions } from "@/lib/auth";

export default async function CrmReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <CrmPage>
      <PageHeading
        title="Sales reports"
        description="Where the pipeline leaks, who is closing, and what is likely to land."
      />
      <ReportsContent />
    </CrmPage>
  );
}
