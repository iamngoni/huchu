import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { CrmPage } from "@/components/crm/crm-page";
import { TemplatesContent } from "@/components/crm/templates/templates-content";
import { authOptions } from "@/lib/auth";

export default async function CrmTemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <CrmPage>
      <TemplatesContent />
    </CrmPage>
  );
}
