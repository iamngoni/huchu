import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SubjectRecordPage } from "@/components/schools/records/subject-record-page";
import { authOptions } from "@/lib/auth";

/**
 * S-4.3 — a subject is a record page.
 *
 * New, not a replacement: the subjects list existed and there was nowhere to go
 * from a row. See the student route for why there is no heading here.
 */
export default async function SubjectRecordRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  return <SubjectRecordPage subjectId={id} />;
}
