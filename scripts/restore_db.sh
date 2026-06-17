#!/usr/bin/env bash
# =============================================================================
# scripts/restore_db.sh
# Bantay Bayan System — PostgreSQL Database Restore Script
# =============================================================================
# Restores a compressed pg_dump archive to a target PostgreSQL/Supabase instance.
# All connection details come from environment variables.
#
# Required environment variables:
#   RESTORE_DB_HOST   — Target database host (can differ from SUPABASE_DB_HOST)
#   PGPASSWORD        — PostgreSQL password for the target host
#   DUMP_FILE         — Full path to the .dump file to restore
#
# Optional:
#   PGPORT            — Database port (default: 5432)
#   PGUSER            — Database user  (default: postgres)
#   PGDATABASE        — Database name  (default: postgres)
#
# Usage:
#   chmod +x scripts/restore_db.sh
#   RESTORE_DB_HOST=db.<new-project>.supabase.co \
#   PGPASSWORD=<password> \
#   DUMP_FILE=./backup/db/bantay_bayan_backup_20240617_020000.dump \
#   ./scripts/restore_db.sh
#
# WARNING:
#   This script drops all existing data in the target database.
#   Ensure you are targeting the correct host before running.
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
RESTORE_DB_HOST="${RESTORE_DB_HOST:?ERROR: RESTORE_DB_HOST is not set.}"
DUMP_FILE="${DUMP_FILE:?ERROR: DUMP_FILE path is not set.}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-postgres}"
DB_NAME="${PGDATABASE:-postgres}"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
if [ -z "${PGPASSWORD:-}" ]; then
  echo "ERROR: PGPASSWORD is not set." >&2
  exit 1
fi

if [ ! -f "${DUMP_FILE}" ]; then
  echo "ERROR: Dump file not found: ${DUMP_FILE}" >&2
  exit 1
fi

if ! command -v pg_restore &>/dev/null; then
  echo "ERROR: pg_restore is not installed or not in PATH." >&2
  exit 1
fi

# ── Safety prompt ─────────────────────────────────────────────────────────────
echo "=========================================="
echo "  BANTAY BAYAN — DATABASE RESTORE"
echo "=========================================="
echo "  Target host : ${RESTORE_DB_HOST}:${DB_PORT}"
echo "  Target DB   : ${DB_NAME}"
echo "  Dump file   : ${DUMP_FILE}"
echo ""
echo "WARNING: This will OVERWRITE existing data in '${DB_NAME}' on '${RESTORE_DB_HOST}'."
read -r -p "Type 'yes' to confirm: " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

# ── Run the restore ───────────────────────────────────────────────────────────
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting restore..."

pg_restore \
  -h "${RESTORE_DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -v \
  "${DUMP_FILE}"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Restore complete."
echo ""
echo "Next steps:"
echo "  1. Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your hosting environment."
echo "  2. Redeploy the frontend application."
echo "  3. Run scripts/verify_security.sql in the Supabase SQL Editor."
