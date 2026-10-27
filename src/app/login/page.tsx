import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const OAUTH_ERRORS: Record<string, string> = {
  AccessDenied: "La connexion a été annulée ou refusée par le fournisseur.",
  OAuthAccountNotLinked: "Cette adresse e-mail est déjà liée à une autre méthode de connexion.",
  Configuration: "La connexion externe n'est pas configurée sur cette instance.",
  CredentialsSignin: "E-mail ou mot de passe incorrect.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");
  const params = await searchParams;
  const providers = [
    ...(env.googleEnabled ? (["google"] as const) : []),
    ...(env.facebookEnabled ? (["facebook"] as const) : []),
    ...(env.githubEnabled ? (["github"] as const) : []),
  ];
  const initialError = params.error ? OAUTH_ERRORS[params.error] ?? "La connexion a échoué." : null;

  return (
    <AuthShell
      title="Bon retour au studio"
      subtitle="Connectez-vous pour retrouver vos applications et lancer une nouvelle génération."
      footer={
        <span className="inline-flex items-center gap-1.5 text-[11px] text-white/25">
          <LockKeyhole className="h-3 w-3" /> Session chiffrée · 30 jours
        </span>
      }
    >
      <AuthForm mode="login" providers={providers} next={params.next} initialError={initialError} />
    </AuthShell>
  );
}
