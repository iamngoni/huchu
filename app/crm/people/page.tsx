import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { PeopleContent } from "@/components/crm/records/people-content";
import { authOptions } from "@/lib/auth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CrmPeoplePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const params = await searchParams;
  return (
    <div className="mx-auto w-full max-w-[110rem]">
      <PeopleContent openCreate={params.new === "1"} />
    </div>
  );
}
