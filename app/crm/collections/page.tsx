import { getServerSession } from "next-auth";
import { CrmPage } from "@/components/crm/crm-page";
import { redirect } from "next/navigation";

import { PageHeading } from "@/components/layout/page-heading";
import { CollectionsContent } from "@/components/crm/collections/collections-content";
import { authOptions } from "@/lib/auth";

export default async function CrmCollectionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <CrmPage>
      <PageHeading
        title="Collections"
        description="Who owes what, who promised when, and who to ring first."
      />
      <CollectionsContent />
    </CrmPage>
  );
}
