import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { TeachingResourcesContent } from "@/components/schools/timetable/resources-content";
import { authOptions } from "@/lib/auth";

/** The staff-room shelf: worksheets, past papers, slide decks. */
export default async function TeachingResourcesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Teaching resources" />
      <TeachingResourcesContent />
    </div>
  );
}
