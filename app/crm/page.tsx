import { getServerSession } from "next-auth";
import { CrmPage } from "@/components/crm/crm-page";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { CrmDashboardContent } from "@/components/crm/crm-dashboard-content";
import { authOptions } from "@/lib/auth";

export default async function CrmDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <CrmPage>
      <PageHeading title="CRM" />
      <CrmDashboardContent />
    </CrmPage>
  );
}
