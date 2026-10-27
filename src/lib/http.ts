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

export type DatabaseIssue =
  | "url_missing"
  | "url_invalid"
  | "auth"
  | "network"
  | "timeout"
  | "engine"
  | "schema_missing"
  | "schema_outdated"
  | "database_missing"
  | "closed"
  | "unavailable";

interface DatabaseErrorInfo {
  status: number;
  code: string;
  issue: DatabaseIssue;
  message: string;
}

const DATABASE_DIAGNOSIS: Record<DatabaseIssue, Omit<DatabaseErrorInfo, "issue">> = {
  url_missing: {
    status: 503,
    code: "database_url_missing",
    message:
      "DATABASE_URL est absente sur Vercel : ajoutez la chaîne de connexion Supabase (Production et Preview), puis redéployez.",
  },
  url_invalid: {
    status: 503,
    code: "database_url_invalid",
    message:
      "DATABASE_URL est invalide : utilisez la chaîne Supabase « Transaction pooler » (port 6543, pgbouncer=true).",
  },
  auth: {
    status: 503,
    code: "database_auth",
    message: "Connexion à la base refusée : vérifiez les identifiants de DATABASE_URL.",
  },
  network: {
    status: 503,
    code: "database_unreachable",
    message: "Base de données injoignable : vérifiez DATABASE_URL et l'accès réseau à Supabase.",
  },
  timeout: {
    status: 504,
    code: "database_timeout",
    message: "Délai de connexion à la base dépassé. Réessayez dans un instant.",
  },
  engine: {
    status: 503,
    code: "database_engine_missing",
    message:
      "Moteur Prisma absent du déploiement Vercel : relancez un déploiement (npm run build:vercel génère le client PostgreSQL).",
  },
  schema_missing: {
    status: 503,
    code: "database_schema_missing",
    message:
      "Base non initialisée : appliquez les migrations PostgreSQL (workflow « Base de données » ou npm run pg:deploy).",
  },
  schema_outdated: {
    status: 503,
    code: "database_schema_outdated",
    message: "Schéma de base obsolète : appliquez les migrations PostgreSQL.",
  },
  database_missing: {
    status: 500,
    code: "database_missing",
    message: "La base de données indiquée n'existe pas : vérifiez le nom de la base dans DATABASE_URL.",
  },
  closed: {
    status: 503,
    code: "database_closed",
    message: "Connexion à la base interrompue. Réessayez dans un instant.",
  },
  unavailable: {
    status: 503,
    code: "database_unavailable",
    message: "Base de données indisponible : consultez /api/health et les logs Vercel.",
  },
};

const CODE_ISSUES: Record<string, DatabaseIssue> = {
  P1000: "auth",
  P1001: "network",
  P1002: "timeout",
  P1003: "database_missing",
  P1008: "timeout",
  P1017: "closed",
  P2021: "schema_missing",
  P2022: "schema_outdated",
};

function withIssue(issue: DatabaseIssue): DatabaseErrorInfo {
  return { ...DATABASE_DIAGNOSIS[issue], issue };
}

export function classifyDatabaseIssue(error: unknown): DatabaseIssue | null {
  if (!error || typeof error !== "object") return null;
  const record = error as { code?: unknown; name?: unknown; message?: unknown };
  if (typeof record.code === "string" && CODE_ISSUES[record.code]) {
    return CODE_ISSUES[record.code]!;
  }
  if (record.name !== "PrismaClientInitializationError") return null;
  const text = typeof record.message === "string" ? record.message.toLowerCase() : "";
  if (/environment variable not found:\s*database_url|database_url.*(not set|not defined|missing)/.test(text)) {
    return "url_missing";
  }
  if (/(must start with|invalid (url|connection string|port)|error parsing connection string|unsupported protocol)/.test(text)) {
    return "url_invalid";
  }
  if (/(password authentication failed|authentication failed|28p01|invalid credentials|invalid password)/.test(text)) {
    return "auth";
  }
  if (/(query engine|could not locate.*engine|engine.*not found|enoent|unsupported platform)/.test(text)) {
    return "engine";
  }
  if (/(timed out|timeout|etimedout|p1002|p1008)/.test(text)) {
    return "timeout";
  }
  if (/(can't reach database server|could not connect|econnrefused|enotfound|eai_again|getaddrinfo|connection refused)/.test(text)) {
    return "network";
  }
  return "unavailable";
}

export function describeDatabaseError(error: unknown): DatabaseErrorInfo | null {
  const issue = classifyDatabaseIssue(error);
  return issue ? withIssue(issue) : null;
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
