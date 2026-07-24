import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CrmLeadDetailContent } from "@/components/crm/crm-lead-detail-content";
import { authOptions } from "@/lib/auth";

export default async function CrmLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <CrmLeadDetailContent leadId={id} />
    </div>
  );
}
