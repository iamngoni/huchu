import { redirect } from "next/navigation";

/**
 * Tasks and Follow-ups were two doors onto the same queue.
 *
 * Follow-ups now runs on this exact task infrastructure and additionally
 * surfaces the legacy lead reminders, so it is strictly the better of the two.
 * The route stays so existing links and bookmarks keep working.
 */
export default function CrmTasksPage() {
  redirect("/crm/follow-ups");
}
