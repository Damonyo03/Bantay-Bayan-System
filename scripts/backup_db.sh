#!/usr/bin/env bash
# =============================================================================
# scripts/backup_db.sh
# Bantay Bayan System — PostgreSQL Logical Backup Script
# =============================================================================
# Creates a compressed pg_dump archive of the production database.
# All connection details come from environment variables — no hardcoded values.
#
# Required environment variables (set in .env or shell):
#   SUPABASE_DB_HOST   — Supabase database host
#                        e.g.  db.<project-ref>.supabase.co
#   PGPASSWORD         — PostgreSQL password (automatically picked up by pg_dump)
#   BACKUP_DIR         — Directory to store dump files (default: ./backup/db)
#
# Optional:
#   PGPORT             — Database port (default: 5432)
#   PGUSER             — Database user   (default: postgres)
#   PGDATABASE         — Database name   (default: postgres)
#
# Usage:
#   chmod +x scripts/backup_db.sh
#   source .env && ./scripts/backup_db.sh
#
# Cron (run daily at 02:00):
#   0 2 * * * cd /path/to/bantay-bayan && source .env && ./scripts/backup_db.sh >> ./backup/db/backup.log 2>&1
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
DB_HOST="${SUPABASE_DB_HOST:?ERROR: SUPABASE_DB_HOST environment variable is not set.}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-postgres}"
DB_NAME="${PGDATABASE:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backup/db}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="${BACKUP_DIR}/bantay_bayan_backup_${TIMESTAMP}.dump"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
if [ -z "${PGPASSWORD:-}" ]; then
  echo "ERROR: PGPASSWORD environment variable is not set." >&2
  exit 1
fi

if ! command -v pg_dump &>/dev/null; then
  echo "ERROR: pg_dump is not installed or not in PATH." >&2
  exit 1
fi

# Create the backup directory if it does not exist
mkdir -p "${BACKUP_DIR}"

# ── Run the backup ────────────────────────────────────────────────────────────
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting database backup..."
echo "  Host     : ${DB_HOST}:${DB_PORT}"
echo "  Database : ${DB_NAME}"
echo "  Output   : ${DUMP_FILE}"

pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -F c \
  -b \
  -v \
  -f "${DUMP_FILE}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup complete: ${DUMP_FILE}"

# ── Verify the dump is not empty ──────────────────────────────────────────────
DUMP_SIZE=$(stat -c%s "${DUMP_FILE}" 2>/dev/null || stat -f%z "${DUMP_FILE}")
if [ "${DUMP_SIZE}" -lt 1024 ]; then
  echo "WARNING: Dump file appears very small (${DUMP_SIZE} bytes). Verify manually." >&2
fi

# ── Prune old backups ─────────────────────────────────────────────────────────
echo "Removing backup files older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "bantay_bayan_backup_*.dump" -mtime "+${RETENTION_DAYS}" -delete
echo "Cleanup complete."
