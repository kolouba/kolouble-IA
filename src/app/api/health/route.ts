import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let database = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "unavailable";
  }
  const body = {
    status: database === "ok" ? "ok" : "degraded",
    service: "Kôloublé IA",
    database,
    ollama: { baseUrl: env.ollamaBaseUrl, configuredModel: env.defaultModel },
    runtime: env.isVercel ? "vercel" : "self-hosted",
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, {
    status: database === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
