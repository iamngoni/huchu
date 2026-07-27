import { getServerSession } from "next-auth";
import { CrmPage } from "@/components/crm/crm-page";
import { redirect } from "next/navigation";

import { PageChrome } from "@/components/layout/page-chrome";
import { WorkOrdersContent } from "@/components/crm/work-orders/work-orders-content";
import { authOptions } from "@/lib/auth";

export default async function CrmWorkOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <CrmPage>
      <PageChrome title="Jobs" />
      <WorkOrdersContent />
    </CrmPage>
  );
}
