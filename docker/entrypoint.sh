#!/bin/sh
set -eu

if [ -z "${AUTH_SECRET:-}" ]; then
  echo "[kolouble] AUTH_SECRET est requis (32 octets aléatoires recommandés)." >&2
  exit 1
fi

echo "[kolouble] application des migrations SQLite…"
npx prisma migrate deploy --schema prisma/sqlite/schema.prisma

mkdir -p "${WORKSPACE_ROOT:-./workspace}"

echo "[kolouble] démarrage du studio sur le port ${PORT:-3000}."
exec "$@"
