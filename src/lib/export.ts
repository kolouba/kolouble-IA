import { Readable } from "node:stream";
import archiver from "archiver";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/naming";

export interface ExportableFile {
  path: string;
  content: string;
}

export function buildProjectZip(
  project: { id: string; name: string },
  files: ExportableFile[],
): Response {
  const root = slugify(project.name) || "application";
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("warning", (error) => {
    console.warn("[kolouble] zip warning", error);
  });
  archive.on("error", (error) => {
    console.error("[kolouble] zip error", error);
  });

  for (const file of files) {
    archive.append(file.content, { name: `${root}/${file.path}` });
  }
  archive.append(
    JSON.stringify(
      {
        application: project.name,
        projectId: project.id,
        exportedAt: new Date().toISOString(),
        files: files.length,
        generator: "Kôloublé IA",
      },
      null,
      2,
    ),
    { name: `${root}/EXPORT.json` },
  );
  const finalized = archive.finalize();
  void finalized.catch((error) => console.error("[kolouble] zip finalize failed", error));

  const webStream = Readable.toWeb(archive) as unknown as ReadableStream<Uint8Array>;
  const asciiName = root.replace(/[^A-Za-z0-9._-]/g, "-");
  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${asciiName}.zip"; filename*=UTF-8''${encodeURIComponent(`${root}.zip`)}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function markProjectZipUrl(projectId: string): Promise<string> {
  const zipUrl = `/api/projects/${projectId}/export`;
  await prisma.project.update({ where: { id: projectId }, data: { zipUrl } }).catch((error) => {
    console.warn("[kolouble] zipUrl persistence failed", error);
  });
  return zipUrl;
}
