import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { CrmPage } from "@/components/crm/crm-page";
import { TemplateEditor } from "@/components/crm/templates/template-editor";
import { authOptions } from "@/lib/auth";

export default async function CrmTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const { id } = await params;

  return (
    <CrmPage width="narrow">
      <TemplateEditor templateId={id} />
    </CrmPage>
  );
}
