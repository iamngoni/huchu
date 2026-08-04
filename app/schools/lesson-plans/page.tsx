import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { LessonPlansPageContent } from "@/components/schools/timetable/lesson-plans-page-content";
import { authOptions } from "@/lib/auth";

/** Lesson plans and cover, a week at a time. */
export default async function LessonPlansPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Lesson plans" />
      <LessonPlansPageContent />
    </div>
  );
}
