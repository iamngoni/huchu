import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { GradePicker } from "@/components/schools/common/grade-picker";
import { authOptions } from "@/lib/auth";

/**
 * Students starts at the year group, not at a list of every student. See the
 * note on `GradePicker`.
 */
export default async function SchoolsStudentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Students" />
      <GradePicker basePath="/schools/students" />
    </div>
  );
}
