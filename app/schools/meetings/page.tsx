import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { MeetingsAdminContent } from "@/components/schools/meetings/meetings-admin-content";
import { authOptions } from "@/lib/auth";

export default async function SchoolsMeetingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeading
        title="Parent meetings"
        description="The term's parents' evenings across the whole staff room — who is open, who is booked, and which ten minutes are still free."
      />
      <MeetingsAdminContent />
    </div>
  );
}
