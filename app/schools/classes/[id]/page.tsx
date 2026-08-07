import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { ClassRecordPage } from "@/components/schools/records/class-record-page";
import { authOptions } from "@/lib/auth";

/** S-4.3 — a class is a record page. See the student route for why no heading. */
export default async function ClassRecordRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  return <ClassRecordPage classId={id} />;
}
