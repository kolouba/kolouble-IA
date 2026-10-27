import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { enhanceSpec } from "@/lib/generator";
import { requireUser } from "@/lib/guard";
import { assertSameOrigin, jsonError, readJson } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parsePrompt } from "@/lib/spec";
import { enhanceSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    assertSameOrigin(request);
    enforceRateLimit(`enhance:${user.id}`, 12, 10 * 60 * 1000);
    const payload = await readJson(request, enhanceSchema);
    const base = parsePrompt(payload.prompt);
    const model = payload.model ?? env.aiModel ?? env.defaultModel;

    try {
      const enhanced = await enhanceSpec(base, payload.prompt, model, payload.provider);
      const spec = enhanced ?? base;
      return NextResponse.json({
        enhanced: Boolean(enhanced),
        spec,
        warning: enhanced ? null : "L'IA n'a pas répondu : spécification déterministe conservée.",
      });
    } catch (error) {
      return NextResponse.json({
        enhanced: false,
        spec: base,
        warning: error instanceof Error ? error.message : "Ollama indisponible.",
      });
    }
  } catch (error) {
    return jsonError(error);
  }
}
