import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "request_error") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("[kolouble] unexpected error", error);
  return NextResponse.json(
    { error: "Erreur interne. Consultez les logs du serveur.", code: "internal_error" },
    { status: 500 },
  );
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) throw new ApiError(403, "Origine non vérifiable.", "csrf_rejected");
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new ApiError(403, "Origine invalide.", "csrf_rejected");
  }
  if (parsed.host !== host) {
    throw new ApiError(403, "Requête cross-origin refusée.", "csrf_rejected");
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  return request.headers.get("x-real-ip")?.slice(0, 64) || "local";
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) {
    throw new ApiError(413, "Corps de requête trop volumineux.", "payload_too_large");
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "Corps JSON invalide.", "invalid_json");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`)
      .join(" · ");
    throw new ApiError(400, `Données invalides — ${details}`, "validation_error");
  }
  return result.data;
}

export function isPrismaError(error: unknown, code: string): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === code,
  );
}
