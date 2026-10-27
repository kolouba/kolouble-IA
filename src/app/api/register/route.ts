import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { assertSameOrigin, getClientIp, isPrismaError, jsonError, readJson, ApiError } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    enforceRateLimit(`register:${getClientIp(request)}`, 5, 10 * 60 * 1000);
    const payload = await readJson(request, registerSchema);

    const existing = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, "Un compte existe déjà avec cette adresse e-mail.", "email_taken");
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await prisma.user.create({
      data: { email: payload.email, name: payload.name, passwordHash },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cette adresse e-mail.", code: "email_taken" },
        { status: 409 },
      );
    }
    return jsonError(error);
  }
}
