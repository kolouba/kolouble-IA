import { prisma } from "@/lib/db";
import { buildProjectZip, markProjectZipUrl } from "@/lib/export";
import { requireProject, requireUser } from "@/lib/guard";
import { ApiError, jsonError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const project = await requireProject(user.id, id);
    enforceRateLimit(`export:${user.id}`, 10, 60_000);
    const files = await prisma.projectFile.findMany({
      where: { projectId: id },
      orderBy: { path: "asc" },
      select: { path: true, content: true },
    });
    if (files.length === 0) {
      throw new ApiError(409, "Aucun fichier à exporter. Générez d'abord l'application.", "no_files");
    }
    await markProjectZipUrl(id);
    return buildProjectZip({ id: project.id, name: project.name }, files);
  } catch (error) {
    return jsonError(error);
  }
}
