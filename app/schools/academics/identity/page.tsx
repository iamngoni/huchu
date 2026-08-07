import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { IdentitySettingsContent } from "@/components/schools/academics/identity-settings-content";
import { authOptions } from "@/lib/auth";

export default async function SchoolsIdentityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeading
        title="Identity and records"
        description="How this school numbers its pupils, what its ID cards look like, and who may change a record's picture."
      />
      <IdentitySettingsContent />
    </div>
  );
}
