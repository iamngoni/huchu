import { headers } from "next/headers";
import { TeacherPortalProvider } from "@/components/schools/portal/teacher/teacher-portal-context";
import { TeacherPortalShell } from "@/components/schools/portal/teacher/teacher-portal-shell";
import { requirePageAuth } from "@/lib/auth-core/guards";
import { getHostHeaderFromRequestHeaders, getPortalRequestRouting } from "@/lib/platform/tenant";

/**
 * Everything under `/portal/teacher` gets the portal's own shell.
 *
 * The guard lives here rather than on each page so a new screen cannot be
 * added unguarded, and `AppShell` renders once for the whole portal so moving
 * between screens does not rebuild the rail.
 */
export default async function TeacherPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const hostHeader = getHostHeaderFromRequestHeaders(headersList);
  const portalRouting = getPortalRequestRouting(hostHeader, "/portal/teacher");
  await requirePageAuth({
    pathname: "/portal/teacher",
    callbackUrl: portalRouting.callbackPath,
    loginPath: portalRouting.loginPath,
  });

  return (
    <TeacherPortalProvider>
      <TeacherPortalShell>{children}</TeacherPortalShell>
    </TeacherPortalProvider>
  );
}
