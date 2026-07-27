import { getServerSession } from "next-auth";
import { CrmPage } from "@/components/crm/crm-page";
import { redirect } from "next/navigation";
import { PageChrome } from "@/components/layout/page-chrome";
import { CrmSettingsContent } from "@/components/crm/crm-settings-content";
import { authOptions } from "@/lib/auth";

export default async function CrmSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <CrmPage>
      <PageChrome title="CRM settings" />
      <CrmSettingsContent />
    </CrmPage>
  );
}
