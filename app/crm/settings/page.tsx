import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { CrmSettingsContent } from "@/components/crm/crm-settings-content";
import { authOptions } from "@/lib/auth";

export default async function CrmSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeading title="CRM Settings" />
      <CrmSettingsContent />
    </div>
  );
}
