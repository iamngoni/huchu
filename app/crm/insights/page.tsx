import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { CrmInsightsContent } from "@/components/crm/crm-insights-content";
import { authOptions } from "@/lib/auth";

export default async function CrmInsightsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="CRM Insights" />
      <CrmInsightsContent />
    </div>
  );
}
