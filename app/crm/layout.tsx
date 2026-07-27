import type { ReactNode } from "react";

import { GlobalSearch } from "@/components/crm/search/global-search";

/**
 * Every CRM page carries the global search. It is the fastest route to any
 * record, so it belongs on the layout rather than being repeated per page.
 */
export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <GlobalSearch />
      </div>
      {children}
    </div>
  );
}
