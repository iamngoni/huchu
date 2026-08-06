import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { SchemeOfWorkContent } from "@/components/schools/academics/scheme-of-work-content";
import { authOptions } from "@/lib/auth";

export default async function SchoolsSyllabusPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeading
        title="Scheme of work"
        description="Each subject's term written week by week — and what the lesson planner drafts from."
      />
      <SchemeOfWorkContent />
    </div>
  );
}
