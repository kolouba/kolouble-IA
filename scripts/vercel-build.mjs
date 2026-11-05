import { spawnSync } from "node:child_process";

// Vercel (intégration Prisma Postgres) peut injecter DATABASE_URL ou un alias
// POSTGRES_* : on applique les migrations dès qu'une URL est disponible.
const KEYS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
];

const key = KEYS.find((name) => (process.env[name] ?? "").trim());

if (!key) {
  console.warn("[vercel-build] Aucune URL PostgreSQL configurée : migrations ignorées.");
  process.exit(0);
}

console.log(`[vercel-build] Application des migrations PostgreSQL (source : ${key}).`);

const result = spawnSync(
  "npx",
  ["prisma", "migrate", "deploy", "--schema", "prisma/postgres/schema.prisma"],
  {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env[key] },
    shell: process.platform === "win32",
  },
);

if (result.error) {
  console.error("[vercel-build] Échec du lancement de Prisma :", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
