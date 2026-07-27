import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SiteDetailPage } from "@/components/crm/records/site-detail-page";
import { authOptions } from "@/lib/auth";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <SiteDetailPage siteId={id} />
    </div>
  );
}
