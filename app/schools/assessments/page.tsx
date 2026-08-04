import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { GradePicker } from "@/components/schools/common/grade-picker";
import { authOptions } from "@/lib/auth";

/**
 * Which year group's marks.
 *
 * A school of 800 has no use for a page of every assessment it has ever set,
 * and a mark book is kept per class in any case. The year group is the
 * navigation, as it is for students, attendance, results and fees.
 */
export default async function SchoolsAssessmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Assessments" />
      <GradePicker
        basePath="/schools/assessments"
        emptyHint="Marks are recorded against a year group. Set the class ladder up under Academics first."
      />
    </div>
  );
}
