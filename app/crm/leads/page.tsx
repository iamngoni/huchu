import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { LeadsWorkspace } from "@/components/crm/leads/leads-workspace";
import { authOptions } from "@/lib/auth";

export default async function CrmLeadsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <div className="mx-auto w-full max-w-[110rem] space-y-6">
      <PageHeading title="Leads & Pipeline" />
      <LeadsWorkspace />
    </div>
  );
}
