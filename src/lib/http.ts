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

interface DatabaseErrorInfo {
  status: number;
  code: string;
  message: string;
}

const DATABASE_ERRORS: Record<string, DatabaseErrorInfo> = {
  P1000: {
    status: 503,
    code: "database_auth",
    message: "Connexion à la base refusée : vérifiez les identifiants de DATABASE_URL.",
  },
  P1001: {
    status: 503,
    code: "database_unreachable",
    message: "Base de données injoignable : vérifiez DATABASE_URL et l'accès réseau à Supabase.",
  },
  P1002: {
    status: 504,
    code: "database_timeout",
    message: "Délai de connexion à la base dépassé. Réessayez dans un instant.",
  },
  P1003: {
    status: 500,
    code: "database_missing",
    message: "La base de données indiquée n'existe pas.",
  },
  P1008: {
    status: 504,
    code: "database_timeout",
    message: "La base de données ne répond pas. Réessayez dans un instant.",
  },
  P1017: {
    status: 503,
    code: "database_closed",
    message: "Connexion à la base interrompue. Réessayez dans un instant.",
  },
  P2021: {
    status: 503,
    code: "database_schema_missing",
    message:
      "Base non initialisée : appliquez les migrations PostgreSQL (workflow « Base de données » ou npm run pg:deploy).",
  },
  P2022: {
    status: 503,
    code: "database_schema_outdated",
    message: "Schéma de base obsolète : appliquez les migrations PostgreSQL.",
  },
};

export function describeDatabaseError(error: unknown): DatabaseErrorInfo | null {
  if (!error || typeof error !== "object") return null;
  const record = error as { code?: unknown; name?: unknown };
  if (typeof record.code === "string" && DATABASE_ERRORS[record.code]) {
    return DATABASE_ERRORS[record.code]!;
  }
  if (record.name === "PrismaClientInitializationError") {
    return {
      status: 503,
      code: "database_unavailable",
      message: "Base de données indisponible : vérifiez DATABASE_URL sur Vercel.",
    };
  }
  return null;
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  const database = describeDatabaseError(error);
  if (database) {
    console.error("[kolouble] database error", error);
    return NextResponse.json(
      { error: database.message, code: database.code },
      { status: database.status },
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
