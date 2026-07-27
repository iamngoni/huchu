import { getServerSession } from "next-auth";
import { CrmPage } from "@/components/crm/crm-page";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { CrmInsightsContent } from "@/components/crm/crm-insights-content";
import { authOptions } from "@/lib/auth";

export default async function CrmInsightsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <CrmPage>
      <PageHeading title="CRM Insights" />
      <CrmInsightsContent />
    </CrmPage>
  );
}
