import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { YearRollUpContent } from "@/components/schools/students/year-rollup-content";
import { authOptions } from "@/lib/auth";

/**
 * The end of the year, as one reviewable operation.
 *
 * Deliberately its own page rather than a button on the students list: it is
 * the only action in the module that touches every child's record, and it does
 * not belong next to "add a student".
 */
export default async function YearRollUpPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Roll up the year" />
      <YearRollUpContent />
    </div>
  );
}
