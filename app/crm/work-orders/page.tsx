import { getServerSession } from "next-auth";
import { CrmPage } from "@/components/crm/crm-page";
import { redirect } from "next/navigation";

import { PageHeading } from "@/components/layout/page-heading";
import { WorkOrdersContent } from "@/components/crm/work-orders/work-orders-content";
import { authOptions } from "@/lib/auth";

export default async function CrmWorkOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <CrmPage>
      <PageHeading
        title="Jobs"
        description="What the crews are doing today, and what the customer signed for."
      />
      <WorkOrdersContent />
    </CrmPage>
  );
}
