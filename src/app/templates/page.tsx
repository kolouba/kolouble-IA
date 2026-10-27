import { auth } from "@/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TemplatesClient } from "@/components/templates-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Modèles métier",
  description:
    "CRM, ERP, facturation, RH, e-commerce, école, santé, mairie, association, église, collectivité et funéraire : générez une application Flutter complète à partir d'un modèle.",
};

export default async function TemplatesPage() {
  const session = await auth();
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] grid-fade" aria-hidden="true" />
      <SiteHeader signedIn={Boolean(session?.user?.id)} />
      <TemplatesClient />
      <SiteFooter />
    </main>
  );
}
