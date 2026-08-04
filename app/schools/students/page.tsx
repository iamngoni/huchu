import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { GradePickerContent } from "@/components/schools/students/grade-picker-content";
import { authOptions } from "@/lib/auth";

/**
 * Students starts at the year group, not at a list of every student. See the
 * note on `GradePickerContent`.
 */
export default async function SchoolsStudentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Students" />
      <GradePickerContent />
    </div>
  );
}
