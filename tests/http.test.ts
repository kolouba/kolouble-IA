import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ApiError,
  assertSameOrigin,
  describeDatabaseError,
  getClientIp,
  isPrismaError,
  jsonError,
  readJson,
} from "@/lib/http";

function request(headers: Record<string, string> = {}, body?: string): Request {
  return new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers,
    body,
  });
}

describe("ApiError et jsonError", () => {
  it("sérialise une erreur applicative", async () => {
    const response = jsonError(new ApiError(403, "Interdit.", "forbidden"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Interdit.", code: "forbidden" });
  });

  it("masque les erreurs internes", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = jsonError(new Error("base de données inaccessible"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("internal_error");
    expect(body.error).not.toContain("base de données");
    expect(spy).toHaveBeenCalled();
  });

  it("traduit une base non migrée en message actionnable", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = jsonError({ code: "P2021" });
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("database_schema_missing");
    expect(body.error).toContain("migrations PostgreSQL");
    expect(spy).toHaveBeenCalled();
  });

  it("traduit une base injoignable", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = jsonError({ name: "PrismaClientInitializationError", message: "Can't reach database server" });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "database_unreachable" });
    expect(spy).toHaveBeenCalled();
  });

  it("traduit une variable DATABASE_URL absente", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = jsonError({
      name: "PrismaClientInitializationError",
      message: "error: Environment variable not found: DATABASE_URL.",
    });
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("database_url_missing");
    expect(body.error).toContain("DATABASE_URL");
    expect(spy).toHaveBeenCalled();
  });
});

describe("describeDatabaseError", () => {
  it("reconnaît les codes Prisma connus", () => {
    expect(describeDatabaseError({ code: "P1001" })?.code).toBe("database_unreachable");
    expect(describeDatabaseError({ code: "P2022" })?.code).toBe("database_schema_outdated");
  });

  it("classe les erreurs d'initialisation Prisma", () => {
    expect(
      describeDatabaseError({ name: "PrismaClientInitializationError", message: "Can't reach database server at db" }),
    ).toMatchObject({ issue: "network", code: "database_unreachable" });
    expect(
      describeDatabaseError({
        name: "PrismaClientInitializationError",
        message: "the URL must start with the protocol `postgresql://`",
      }),
    ).toMatchObject({ issue: "url_invalid", code: "database_url_invalid" });
    expect(
      describeDatabaseError({ name: "PrismaClientInitializationError", message: "password authentication failed for user" }),
    ).toMatchObject({ issue: "auth", code: "database_auth" });
    expect(
      describeDatabaseError({
        name: "PrismaClientInitializationError",
        message: "Query engine library for current platform could not be found",
      }),
    ).toMatchObject({ issue: "engine", code: "database_engine_missing" });
  });

  it("ignore les erreurs non liées à la base", () => {
    expect(describeDatabaseError(new Error("boom"))).toBeNull();
    expect(describeDatabaseError({ code: "P2002" })).toBeNull();
    expect(describeDatabaseError(null)).toBeNull();
  });
});

describe("assertSameOrigin", () => {
  it("accepte une requête sans header Origin", () => {
    expect(() => assertSameOrigin(request())).not.toThrow();
  });

  it("accepte la même origine", () => {
    expect(() => assertSameOrigin(request({ origin: "http://localhost:3000", host: "localhost:3000" }))).not.toThrow();
    expect(() =>
      assertSameOrigin(
        request({ origin: "https://app.exemple.ci", "x-forwarded-host": "app.exemple.ci" }),
      ),
    ).not.toThrow();
  });

  it("refuse une origine différente", () => {
    expect(() => assertSameOrigin(request({ origin: "https://evil.example", host: "app.exemple.ci" }))).toThrow(
      /cross-origin/,
    );
  });

  it("refuse une origine invalide ou non vérifiable", () => {
    expect(() => assertSameOrigin(request({ origin: "https://evil.example" }))).toThrow(/non vérifiable/);
    expect(() => assertSameOrigin(request({ origin: "::::", host: "localhost:3000" }))).toThrow(/invalide/);
    expect(() => assertSameOrigin(request({ origin: "http://evil.test:3000", host: "localhost:3000" }))).toThrow(
      /cross-origin/,
    );
  });
});

describe("getClientIp", () => {
  it("utilise le premier hop de x-forwarded-for", () => {
    expect(
      getClientIp(request({ "x-forwarded-for": " 203.0.113.9, 10.0.0.1 " })),
    ).toBe("203.0.113.9");
  });

  it("retombe sur x-real-ip puis local", () => {
    expect(getClientIp(request({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(getClientIp(request())).toBe("local");
  });

  it("tronque les adresses trop longues", () => {
    expect(getClientIp(request({ "x-real-ip": "a".repeat(100) }))).toHaveLength(64);
  });
});

describe("readJson", () => {
  const schema = z.object({ name: z.string().min(2) });

  it("parse et valide un corps JSON", async () => {
    await expect(readJson(request({ "content-type": "application/json" }, '{"name":"Projet"}'), schema)).resolves.toEqual({
      name: "Projet",
    });
  });

  it("refuse un JSON invalide", async () => {
    await expect(readJson(request({}, "{oops"), schema)).rejects.toMatchObject({
      status: 400,
      code: "invalid_json",
    });
  });

  it("refuse un corps trop volumineux", async () => {
    await expect(
      readJson(request({ "content-length": "2000000" }, "{}"), schema),
    ).rejects.toMatchObject({ status: 413, code: "payload_too_large" });
  });

  it("renvoie le détail de validation", async () => {
    const error = await readJson(request({}, '{"name":"a"}'), schema).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).message).toContain("name");
  });
});

describe("isPrismaError", () => {
  it("reconnaît un code Prisma", () => {
    expect(isPrismaError({ code: "P2002" }, "P2002")).toBe(true);
    expect(isPrismaError({ code: "P2002" }, "P2025")).toBe(false);
    expect(isPrismaError(null, "P2002")).toBe(false);
    expect(isPrismaError("P2002", "P2002")).toBe(false);
  });
});
