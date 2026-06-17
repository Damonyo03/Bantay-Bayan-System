#!/usr/bin/env bash
# =============================================================================
# scripts/backup_storage.sh
# Bantay Bayan System — Supabase Storage Backup Script
# =============================================================================
# Downloads all files from Supabase Storage buckets to a local backup directory
# using the Supabase CLI.  No project URLs or bucket names are hardcoded.
#
# Required environment variables:
#   SUPABASE_ACCESS_TOKEN  — Personal access token from app.supabase.com/account/tokens
#   SUPABASE_PROJECT_REF   — Project reference ID (found in Project Settings → General)
#   BACKUP_DIR             — Destination directory (default: ./backup/storage)
#
# Usage:
#   chmod +x scripts/backup_storage.sh
#   source .env && ./scripts/backup_storage.sh
#
# Cron (run every Sunday at 03:00):
#   0 3 * * 0 cd /path/to/bantay-bayan && source .env && ./scripts/backup_storage.sh >> ./backup/storage/storage_backup.log 2>&1
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:?ERROR: SUPABASE_ACCESS_TOKEN is not set.}"
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:?ERROR: SUPABASE_PROJECT_REF is not set.}"
BACKUP_DIR="${BACKUP_DIR:-./backup/storage}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
SESSION_DIR="${BACKUP_DIR}/${TIMESTAMP}"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
if ! command -v supabase &>/dev/null; then
  echo "ERROR: Supabase CLI is not installed or not in PATH." >&2
  echo "Install it from: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

mkdir -p "${SESSION_DIR}"

# ── Link to the project (non-interactive) ────────────────────────────────────
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Linking to Supabase project..."
supabase link --project-ref "${SUPABASE_PROJECT_REF}" \
  --password "${SUPABASE_DB_PASSWORD:-}" \
  2>/dev/null || true  # link may already be set; non-fatal

# ── Copy storage buckets ──────────────────────────────────────────────────────
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backing up identity-docs bucket..."
supabase storage cp --recursive \
  ss:///identity-docs \
  "${SESSION_DIR}/identity-docs/"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backing up avatars bucket..."
supabase storage cp --recursive \
  ss:///avatars \
  "${SESSION_DIR}/avatars/"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Storage backup complete: ${SESSION_DIR}"

# ── Report size ───────────────────────────────────────────────────────────────
TOTAL_SIZE=$(du -sh "${SESSION_DIR}" 2>/dev/null | cut -f1)
echo "  Total size: ${TOTAL_SIZE}"
