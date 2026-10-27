import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { OnBradeCredit } from "@/components/onbrade-credit";
import { SettingsClient } from "@/components/settings-client";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/settings");

  return (
    <>
      <AppHeader name={session.user.name ?? null} email={session.user.email ?? null} active="settings" />
      <SettingsClient
        name={session.user.name ?? null}
        email={session.user.email ?? null}
        googleEnabled={env.googleEnabled}
        facebookEnabled={env.facebookEnabled}
        githubEnabled={env.githubEnabled}
        defaultProvider={env.aiProvider}
        figmaEnabled={env.figmaEnabled}
        buildEnabled={env.buildEnabled}
        defaultModel={env.defaultModel}
        isVercel={env.isVercel}
      />
      <footer className="container-page border-t border-white/[0.05] py-6 text-[10.5px] text-white/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Kôloublé IA · paramètres</span>
          <span>Sécurité · conformité · stockage</span>
        </div>
        <div className="mt-3 text-white/35">
          <OnBradeCredit />
        </div>
      </footer>
    </>
  );
}
