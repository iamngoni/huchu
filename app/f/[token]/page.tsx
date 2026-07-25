import { IntakeFormContent } from "@/components/crm/public/intake-form-content";

export const dynamic = "force-dynamic";

export default async function PublicIntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-neutral-50">
      <IntakeFormContent token={token} />
    </main>
  );
}
