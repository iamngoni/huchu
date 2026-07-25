import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CarSalesLeadsContent } from "@/components/car-sales/leads/car-sales-leads-content";
import { authOptions } from "@/lib/auth";

export default async function CarSalesLeadsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return <CarSalesLeadsContent />;
}
