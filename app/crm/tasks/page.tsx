import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { PageHeading } from "@/components/layout/page-heading";
import { TaskQueueContent } from "@/components/crm/tasks/task-queue-content";
import { authOptions } from "@/lib/auth";

export default async function CrmTasksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeading
        title="Tasks"
        description="What needs doing, and what happened when it was done."
      />
      <TaskQueueContent />
    </div>
  );
}
