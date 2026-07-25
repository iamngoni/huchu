import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CarSalesContent } from "@/components/car-sales/car-sales-content";
import { authOptions } from "@/lib/auth";

export default async function CarSalesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return <CarSalesContent />;
}
