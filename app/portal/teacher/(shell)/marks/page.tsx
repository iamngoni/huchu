import { headers } from "next/headers";
import { PageHeading } from "@/components/layout/page-heading";
import { TeacherMarksContent } from "@/components/schools/portal/teacher-marks-content";
import { requirePageAuth } from "@/lib/auth-core/guards";
import { getHostHeaderFromRequestHeaders, getPortalRequestRouting } from "@/lib/platform/tenant";

/**
 * A teacher's own mark book.
 *
 * The office has the same screen organised by year group, because when a
 * teacher is away somebody still has to enter the marks. This one is organised
 * by the classes she takes, which is how she thinks about them.
 */
export default async function TeacherMarksPage() {
  const headersList = await headers();
  const hostHeader = getHostHeaderFromRequestHeaders(headersList);
  const portalRouting = getPortalRequestRouting(hostHeader, "/portal/teacher");
  await requirePageAuth({
    pathname: "/portal/teacher/marks",
    callbackUrl: `${portalRouting.callbackPath.replace(/\/$/, "")}/marks`,
    loginPath: portalRouting.loginPath,
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Marks" />
      <TeacherMarksContent />
    </div>
  );
}
