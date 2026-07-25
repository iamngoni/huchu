import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { CrmFormsContent } from "@/components/crm/crm-forms-content";
import { authOptions } from "@/lib/auth";

export default async function CrmFormsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Intake Forms" />
      <CrmFormsContent />
    </div>
  );
}
