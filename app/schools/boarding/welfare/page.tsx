import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { WelfareContent } from "@/components/schools/boarding/welfare-content";
import { authOptions } from "@/lib/auth";

/**
 * Health, allergies and consent.
 *
 * Under Boarding because that is the band it is sold in and the persona that
 * needs it at two in the morning, but it covers day pupils too — an allergy
 * does not care whether a child sleeps at school.
 */
export default async function WelfarePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Health and welfare" />
      <WelfareContent />
    </div>
  );
}
