import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { OnBradeCredit } from "@/components/onbrade-credit";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");
  const params = await searchParams;
  const providers = [
    ...(env.googleEnabled ? (["google"] as const) : []),
    ...(env.facebookEnabled ? (["facebook"] as const) : []),
    ...(env.githubEnabled ? (["github"] as const) : []),
  ];

  return (
    <AuthShell
      title="Créez votre studio"
      subtitle="Un compte suffit pour générer, éditer et exporter autant d'applications que vous voulez."
      footer={
        <div className="flex flex-col items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-white/25">
            <ShieldCheck className="h-3 w-3" /> Vos fichiers restent dans votre instance
          </span>
          <OnBradeCredit className="justify-center text-[10.5px] text-white/30" />
        </div>
      }
    >
      <AuthForm mode="register" providers={providers} next={params.next} />
    </AuthShell>
  );
}
