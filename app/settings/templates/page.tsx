"use client";

import { ManagementShell } from "@/components/settings/management-shell";
import { TemplateStudio } from "@/components/settings/template-studio";

export default function DocumentTemplatesPage() {
  return (
    <ManagementShell
      area="document-templates"
      title="Document Templates"
      description="Design how your quotations, invoices, receipts, reports, and tickets look when exported or printed. Changes apply to every PDF the platform generates."
    >
      <TemplateStudio />
    </ManagementShell>
  );
}
