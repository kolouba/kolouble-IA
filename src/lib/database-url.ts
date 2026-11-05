// L'intégration Supabase de Vercel injecte POSTGRES_PRISMA_URL / POSTGRES_URL
// plutôt que DATABASE_URL : on accepte les deux pour éviter une copie manuelle.
export const DATABASE_URL_KEYS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
] as const;

export type DatabaseUrlSource = (typeof DATABASE_URL_KEYS)[number];
export type Environment = Record<string, string | undefined>;

export interface ResolvedDatabaseUrl {
  url?: string;
  source?: DatabaseUrlSource;
}

export function resolveDatabaseUrl(environment: Environment = process.env): ResolvedDatabaseUrl {
  for (const key of DATABASE_URL_KEYS) {
    const value = environment[key]?.trim();
    if (value) return { url: value, source: key };
  }
  return {};
}

export function ensureDatabaseUrl(environment: Environment = process.env): ResolvedDatabaseUrl {
  const resolved = resolveDatabaseUrl(environment);
  if (resolved.url && !environment.DATABASE_URL) {
    environment.DATABASE_URL = resolved.url;
  }
  return resolved;
}
