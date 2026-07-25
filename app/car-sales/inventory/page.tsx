import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CarSalesInventoryContent } from "@/components/car-sales/inventory/car-sales-inventory-content";
import { authOptions } from "@/lib/auth";

export default async function CarSalesInventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return <CarSalesInventoryContent />;
}
