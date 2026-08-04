import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { ClassAssessmentsContent } from "@/components/schools/assessments/class-assessments-content";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClassAssessmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ streamId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const { classId } = await params;
  const { streamId } = await searchParams;

  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: classId, companyId: session.user.companyId },
    select: { id: true, name: true },
  });
  if (!schoolClass) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title={`${schoolClass.name} assessments`} />
      <ClassAssessmentsContent
        classId={schoolClass.id}
        initialStreamId={streamId}
      />
    </div>
  );
}
