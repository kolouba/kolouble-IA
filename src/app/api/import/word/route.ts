import { NextResponse } from "next/server";
import { DocxError, extractDocxText } from "@/lib/docx";
import { requireUser } from "@/lib/guard";
import { ApiError, assertSameOrigin, jsonError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_WORD_BYTES = 8_000_000;
const MAX_PROMPT_CHARS = 4000;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertSameOrigin(request);
    enforceRateLimit(`import:word:${user.id}`, 12, 10 * 60 * 1000);

    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_WORD_BYTES + 200_000) {
      throw new ApiError(413, "Fichier Word trop volumineux (8 Mo maximum).", "payload_too_large");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "Formulaire d'import invalide.", "invalid_form");
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "Aucun fichier Word fourni.", "missing_file");
    }
    if (file.size === 0) {
      throw new ApiError(400, "Le fichier Word est vide.", "empty_file");
    }
    if (file.size > MAX_WORD_BYTES) {
      throw new ApiError(413, "Fichier Word trop volumineux (8 Mo maximum).", "payload_too_large");
    }
    if (!file.name.toLowerCase().endsWith(".docx")) {
      throw new ApiError(
        415,
        "Format non pris en charge : enregistrez le document au format .docx.",
        "unsupported_format",
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extracted: ReturnType<typeof extractDocxText>;
    try {
      extracted = extractDocxText(buffer);
    } catch (error) {
      if (error instanceof DocxError) {
        throw new ApiError(400, error.message, "invalid_docx");
      }
      throw error;
    }

    const truncated = extracted.text.length > MAX_PROMPT_CHARS;
    return NextResponse.json({
      text: truncated ? extracted.text.slice(0, MAX_PROMPT_CHARS) : extracted.text,
      paragraphs: extracted.paragraphs,
      characters: extracted.text.length,
      truncated,
      fileName: file.name.slice(0, 120),
    });
  } catch (error) {
    return jsonError(error);
  }
}
