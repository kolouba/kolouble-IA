import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { describeDatabaseError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let database = "ok";
  let schema = "ok";
  let databaseError: unknown = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = "unavailable";
    schema = "unknown";
    databaseError = error;
  }
  if (database === "ok") {
    try {
      await prisma.user.count();
    } catch (error) {
      schema = "missing";
      databaseError = error;
    }
  }
  const healthy = database === "ok" && schema === "ok";
  const diagnosis = databaseError ? describeDatabaseError(databaseError) : null;
  const databaseIssue = diagnosis?.issue ?? (healthy ? undefined : "unavailable");
  const body = {
    status: healthy ? "ok" : "degraded",
    service: "Kôloublé IA",
    database,
    schema,
    ...(databaseIssue ? { databaseIssue } : {}),
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    ...(diagnosis ? { hint: diagnosis.message } : {}),
    ollama: { baseUrl: env.ollamaBaseUrl, configuredModel: env.defaultModel },
    runtime: env.isVercel ? "vercel" : "self-hosted",
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, {
    status: healthy ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
