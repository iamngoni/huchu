import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CarSalesDealsContent } from "@/components/car-sales/deals/car-sales-deals-content";
import { authOptions } from "@/lib/auth";

export default async function CarSalesDealsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return <CarSalesDealsContent />;
}
