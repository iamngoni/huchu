import { headers } from "next/headers";
import { PageHeading } from "@/components/layout/page-heading";
import { TeacherRegisterContent } from "@/components/schools/portal/teacher-register-content";
import { requirePageAuth } from "@/lib/auth-core/guards";
import { getHostHeaderFromRequestHeaders, getPortalRequestRouting } from "@/lib/platform/tenant";

/**
 * Taking a register is a teacher's job, so it lives in the teacher's portal.
 * The admin side answers "which registers have been taken", which is a
 * different question and a different screen.
 */
export default async function TeacherRegisterPage() {
  const headersList = await headers();
  const hostHeader = getHostHeaderFromRequestHeaders(headersList);
  // Routing is resolved from the portal's base path — on a portal host the
  // public URL is rooted there, so the sub-path is appended to whatever
  // `callbackPath` turns out to be rather than passed in as a portal of its own.
  const portalRouting = getPortalRequestRouting(hostHeader, "/portal/teacher");
  await requirePageAuth({
    pathname: "/portal/teacher/register",
    callbackUrl: `${portalRouting.callbackPath.replace(/\/$/, "")}/register`,
    loginPath: portalRouting.loginPath,
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Take the register" />
      <TeacherRegisterContent />
    </div>
  );
}
