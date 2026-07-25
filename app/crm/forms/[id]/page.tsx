import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CrmFormBuilderContent } from "@/components/crm/crm-form-builder-content";
import { authOptions } from "@/lib/auth";

export default async function CrmFormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <CrmFormBuilderContent formId={id} />
    </div>
  );
}
