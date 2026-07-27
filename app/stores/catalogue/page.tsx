import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { PageHeading } from "@/components/layout/page-heading";
import { CataloguePanel } from "@/components/inventory/catalogue-panel";
import { authOptions } from "@/lib/auth";

/**
 * The shared catalogue's own home.
 *
 * It was only reachable from CRM settings, which is the wrong door: the
 * catalogue is a Stock & Inventory concern that the CRM, Retail and the
 * workshop all read from. The CRM tab still works and renders this same panel.
 */
export default async function StoresCataloguePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading
        title="Catalogue"
        description="Everything the business sells — goods, materials and services — priced once for every module."
      />
      <CataloguePanel />
    </div>
  );
}
