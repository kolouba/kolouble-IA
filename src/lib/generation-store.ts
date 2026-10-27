import { env } from "@/lib/env";
import type { GeneratedFile } from "@/lib/generator/types";
import { prisma } from "@/lib/db";
import { mirrorProjectWorkspace, type MirrorResult } from "@/lib/workspace";

export interface PersistFilesResult {
  filesWritten: number;
  warnings: string[];
  mirror: MirrorResult | null;
}

export async function persistGeneratedFiles(
  projectId: string,
  files: GeneratedFile[],
  options: { preserveEdits?: boolean } = {},
): Promise<PersistFilesResult> {
  const warnings: string[] = [];
  const existing = await prisma.projectFile.findMany({
    where: { projectId },
    select: { path: true, source: true },
  });
  const existingByPath = new Map(existing.map((file) => [file.path, file.source]));
  const generatedPaths = new Set(files.map((file) => file.path));
  const toWrite = files.filter((file) => {
    if (options.preserveEdits && existingByPath.get(file.path) === "user") {
      warnings.push(`Modification utilisateur conservée : ${file.path}.`);
      return false;
    }
    return true;
  });
  const stalePaths = existing
    .filter((file) => !generatedPaths.has(file.path) && file.source !== "user")
    .map((file) => file.path);

  const operations = [
    ...(stalePaths.length > 0
      ? [
          prisma.projectFile.deleteMany({
            where: { projectId, source: { not: "user" }, path: { in: stalePaths } },
          }),
        ]
      : []),
    ...toWrite.map((file) =>
      prisma.projectFile.upsert({
        where: { projectId_path: { projectId, path: file.path } },
        create: {
          projectId,
          path: file.path,
          content: file.content,
          language: file.language,
          bytes: Buffer.byteLength(file.content, "utf8"),
          source: file.source,
        },
        update: {
          content: file.content,
          language: file.language,
          bytes: Buffer.byteLength(file.content, "utf8"),
          source: file.source,
        },
      }),
    ),
  ];
  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }
  const filesWritten = await prisma.projectFile.count({ where: { projectId } });

  let mirror: MirrorResult | null = null;
  if (!env.isVercel) {
    try {
      const dbFiles = await prisma.projectFile.findMany({
        where: { projectId },
        select: { path: true, content: true, language: true, source: true },
      });
      mirror = await mirrorProjectWorkspace(
        projectId,
        dbFiles.map((file) => ({
          ...file,
          source: file.source as "scaffold" | "ai" | "user",
        })),
      );
    } catch (error) {
      warnings.push(`Miroir local indisponible : ${error instanceof Error ? error.message : "erreur inconnue"}.`);
    }
  }

  return { filesWritten, warnings, mirror };
}
