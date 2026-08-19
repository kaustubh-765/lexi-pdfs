#!/bin/bash
set -e

echo "Waiting for Postgres..."
until pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; do
  sleep 1
done
echo "Postgres is ready."

# Both commands are idempotent (db push syncs to the current schema; the SQL
# file uses IF NOT EXISTS throughout), safe to re-run on every container start.
echo "Syncing database schema..."
npx prisma db push --skip-generate

echo "Applying pgvector extension + HNSW index..."
psql "$DATABASE_URL" -f prisma/migrations/0001_init_pgvector.sql

exec "$@"
