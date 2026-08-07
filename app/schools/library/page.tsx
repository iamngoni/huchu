import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { LibraryContent } from "@/components/schools/library/library-content";
import { authOptions } from "@/lib/auth";

/** The library, from the issue desk. */
export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Library" />
      <LibraryContent />
    </div>
  );
}
