import { getServerSession } from "next-auth";
import { CrmPage } from "@/components/crm/crm-page";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { CrmAppointmentsContent } from "@/components/crm/crm-appointments-content";
import { authOptions } from "@/lib/auth";

export default async function CrmAppointmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <CrmPage>
      <PageHeading title="Site Visits" />
      <CrmAppointmentsContent />
    </CrmPage>
  );
}
