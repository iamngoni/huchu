import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { RegisterOversightContent } from "@/components/schools/attendance/register-oversight-content";
import { authOptions } from "@/lib/auth";

/**
 * The office's view of attendance: which registers are in and which are not.
 * Taking one is a teacher's job and lives in the teacher portal.
 */
export default async function SchoolsAttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Attendance" />
      <RegisterOversightContent />
    </div>
  );
}
