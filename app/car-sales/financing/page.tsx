import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CarSalesFinancingContent } from "@/components/car-sales/financing/car-sales-financing-content";
import { authOptions } from "@/lib/auth";

export default async function CarSalesFinancingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return <CarSalesFinancingContent />;
}
