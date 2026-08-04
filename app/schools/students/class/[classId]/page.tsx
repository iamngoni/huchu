import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { ClassStudentsContent } from "@/components/schools/students/class-students-content";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClassStudentsPage({
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

  // Resolved here so the heading names the year group on first paint rather
  // than saying "Students" until a client fetch lands, and so a class from
  // another tenant is a 404 rather than an empty list.
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: classId, companyId: session.user.companyId },
    select: { id: true, name: true },
  });
  if (!schoolClass) notFound();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title={schoolClass.name} />
      <ClassStudentsContent classId={schoolClass.id} initialStreamId={streamId} />
    </div>
  );
}
