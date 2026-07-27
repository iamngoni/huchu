import { getServerSession } from "next-auth";
import { CrmPage } from "@/components/crm/crm-page";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { CrmSettingsContent } from "@/components/crm/crm-settings-content";
import { authOptions } from "@/lib/auth";

export default async function CrmSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <CrmPage>
      <PageHeading title="CRM Settings" />
      <CrmSettingsContent />
    </CrmPage>
  );
}
