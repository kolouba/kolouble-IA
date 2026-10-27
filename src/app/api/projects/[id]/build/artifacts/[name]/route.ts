import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { resolveArtifactPath } from "@/lib/build";
import { requireProject, requireUser } from "@/lib/guard";
import { ApiError, jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; name: string }> },
) {
  try {
    const user = await requireUser();
    const { id, name } = await context.params;
    await requireProject(user.id, id);
    let filePath: string;
    try {
      filePath = await resolveArtifactPath(id, decodeURIComponent(name));
    } catch {
      throw new ApiError(404, "Artefact introuvable.", "artifact_not_found");
    }
    const stream = Readable.toWeb(createReadStream(filePath)) as unknown as ReadableStream<Uint8Array>;
    const contentType = filePath.endsWith(".apk") ? "application/vnd.android.package-archive" : "application/zip";
    return new Response(stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filePath.split(/[\\/]/).pop()}"; filename*=UTF-8''${encodeURIComponent(
          filePath.split(/[\\/]/).pop() ?? "artifact",
        )}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
