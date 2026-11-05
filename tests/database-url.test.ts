import { describe, expect, it } from "vitest";
import { ensureDatabaseUrl, resolveDatabaseUrl, type Environment } from "@/lib/database-url";

describe("resolveDatabaseUrl", () => {
  it("privilégie DATABASE_URL", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: "postgresql://main",
        POSTGRES_URL: "postgresql://pool",
      }),
    ).toEqual({ url: "postgresql://main", source: "DATABASE_URL" });
  });

  it("accepte les variables injectées par l'intégration Vercel/Supabase", () => {
    expect(resolveDatabaseUrl({ POSTGRES_PRISMA_URL: "postgresql://prisma" })).toEqual({
      url: "postgresql://prisma",
      source: "POSTGRES_PRISMA_URL",
    });
    expect(resolveDatabaseUrl({ POSTGRES_URL: "postgresql://pool" })).toEqual({
      url: "postgresql://pool",
      source: "POSTGRES_URL",
    });
    expect(resolveDatabaseUrl({ POSTGRES_URL_NON_POOLING: "postgresql://direct" })).toEqual({
      url: "postgresql://direct",
      source: "POSTGRES_URL_NON_POOLING",
    });
  });

  it("ignore les valeurs vides", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "   ", POSTGRES_URL: "postgresql://pool" })).toEqual({
      url: "postgresql://pool",
      source: "POSTGRES_URL",
    });
  });

  it("retourne vide sans configuration", () => {
    expect(resolveDatabaseUrl({})).toEqual({});
  });
});

describe("ensureDatabaseUrl", () => {
  it("recopie la variable d'intégration dans DATABASE_URL", () => {
    const environment: Environment = { POSTGRES_PRISMA_URL: "postgresql://prisma" };
    ensureDatabaseUrl(environment);
    expect(environment.DATABASE_URL).toBe("postgresql://prisma");
  });

  it("ne remplace pas une DATABASE_URL existante", () => {
    const environment: Environment = {
      DATABASE_URL: "postgresql://main",
      POSTGRES_PRISMA_URL: "postgresql://prisma",
    };
    ensureDatabaseUrl(environment);
    expect(environment.DATABASE_URL).toBe("postgresql://main");
  });
});
