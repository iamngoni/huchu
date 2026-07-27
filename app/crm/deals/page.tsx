import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { DealsContent } from "@/components/crm/records/deals-content";
import { authOptions } from "@/lib/auth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CrmDealsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const params = await searchParams;
  return (
    <div className="mx-auto w-full max-w-[110rem]">
      <DealsContent openCreate={params.new === "1"} />
    </div>
  );
}
