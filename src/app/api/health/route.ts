import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let database = "ok";
  let schema = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "unavailable";
    schema = "unknown";
  }
  if (database === "ok") {
    try {
      await prisma.user.count();
    } catch {
      schema = "missing";
    }
  }
  const healthy = database === "ok" && schema === "ok";
  const hint =
    database === "unavailable"
      ? "Vérifiez DATABASE_URL et l'accès réseau à Supabase."
      : schema === "missing"
        ? "Appliquez les migrations PostgreSQL (workflow « Base de données » ou npm run pg:deploy)."
        : undefined;
  const body = {
    status: healthy ? "ok" : "degraded",
    service: "Kôloublé IA",
    database,
    schema,
    ...(hint ? { hint } : {}),
    ollama: { baseUrl: env.ollamaBaseUrl, configuredModel: env.defaultModel },
    runtime: env.isVercel ? "vercel" : "self-hosted",
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, {
    status: healthy ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
