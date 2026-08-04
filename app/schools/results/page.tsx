import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { GradePicker } from "@/components/schools/common/grade-picker";
import { authOptions } from "@/lib/auth";

/**
 * Results start with "whose marks?" — a sheet belongs to a class, so the class
 * is the route. See the note on `GradePicker`.
 */
export default async function SchoolsResultsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Results" />
      <GradePicker
        basePath="/schools/results"
        emptyHint="A mark sheet belongs to a class. Set the class ladder up under Academics first."
      />
    </div>
  );
}
