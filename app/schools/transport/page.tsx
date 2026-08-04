import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { TransportContent } from "@/components/schools/transport/transport-content";
import { authOptions } from "@/lib/auth";

/**
 * Transport stays with the office.
 *
 * Routes, seats and what the bus is worth in fees are an administrator's
 * business, not a teacher's — the only classroom-adjacent thing here is the
 * driver's register, and the driver is not a teacher either.
 */
export default async function SchoolTransportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading title="Transport" />
      <TransportContent />
    </div>
  );
}
