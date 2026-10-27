import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/app-header";
import { DashboardClient, type DashboardProject } from "@/components/dashboard-client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { isTemplateKey } from "@/lib/spec";

export const dynamic = "force-dynamic";

export const metadata = { title: "Studio" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string | string[]; template?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/dashboard");
  const params = await searchParams;
  const initialOpen = (Array.isArray(params.new) ? params.new[0] : params.new) === "1";
  const templateParam = Array.isArray(params.template) ? params.template[0] : params.template;
  const initialTemplateKey = isTemplateKey(templateParam) ? templateParam : null;

  const projects = await prisma.project.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 60,
    select: {
      id: true,
      name: true,
      description: true,
      prompt: true,
      status: true,
      mode: true,
      model: true,
      templateKey: true,
      saas: true,
      updatedAt: true,
      lastGenerationAt: true,
      _count: { select: { files: true, generations: true } },
    },
  });

  const serialized: DashboardProject[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    prompt: project.prompt,
    status: project.status,
    mode: project.mode,
    model: project.model,
    templateKey: project.templateKey,
    saas: project.saas,
    updatedAt: project.updatedAt.toISOString(),
    lastGenerationAt: project.lastGenerationAt?.toISOString() ?? null,
    fileCount: project._count.files,
    generationCount: project._count.generations,
  }));

  const userName = session.user.name || session.user.email?.split("@")[0] || "créateur";

  return (
    <>
      <AppHeader name={session.user.name ?? null} email={session.user.email ?? null} active="studio" />
      <DashboardClient
        initialProjects={serialized}
        defaultModel={env.defaultModel}
        initialOpen={initialOpen}
        initialTemplateKey={initialTemplateKey}
        figmaEnabled={env.figmaEnabled}
        userName={userName}
      />
      <footer className="container-page flex items-center justify-between border-t border-white/[0.05] py-6 text-[10.5px] text-white/20">
        <span>Kôloublé IA · studio local</span>
        <span>Ollama · Flutter · Supabase</span>
      </footer>
    </>
  );
}
