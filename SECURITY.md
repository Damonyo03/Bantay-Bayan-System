# Security Policy — Bantay Bayan System

## Reporting a Vulnerability

If you discover a security vulnerability in this project, **do not open a public GitHub issue**.  
Contact the development team directly at the barangay office.

---

## ⚠️ Exposed Credentials — Immediate Action Required

A previous commit accidentally exposed `.env.local` to the public repository.  
Follow the steps below **before** the next deployment.

### Step 1 — Rotate API Keys

| Key | Where to Rotate |
|---|---|
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon key → Regenerate |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role key → Regenerate |
| Gemini API Key | Google AI Studio → API Keys → Delete old key → Create new key |

Rotating the Supabase anon key will immediately invalidate any tokens signed with the old secret.  
Rotating the service role key requires re-deploying all Edge Functions.

### Step 2 — Purge the File from Git History

```bash
# Install git-filter-repo (one-time)
pip install git-filter-repo

# Purge .env.local from ALL commits (run from repo root)
git filter-repo --path .env.local --invert-paths --force

# Force-push to overwrite remote history
# WARNING: This rewrites history. All collaborators must re-clone.
git push origin --force --all
git push origin --force --tags
```

> **Note**: After force-pushing, all open pull requests targeting the affected branch will be broken and must be re-opened.

### Step 3 — Verify the File Is Gone

```bash
git log --all --full-history -- .env.local
# Should return no output
```

### Step 4 — Update CI/CD Environment Variables

- In Vercel: Dashboard → Project → Settings → Environment Variables → Add all variables from `.env.example`
- Never store secrets in `vercel.json` or any file tracked by git.

---

## Secret Management Rules

1. **Never commit `.env*` files.** They are listed in `.gitignore`.
2. All credentials must be stored in environment variables — not hardcoded in source files.
3. Use the `.env.example` template (`scripts/.env.example`) for onboarding new developers.
4. The Supabase `service_role` key must **never** be used in the frontend (browser-accessible) code.

---

## Database Security

- Row-Level Security (RLS) is enabled on all public tables.
- A privilege-escalation prevention trigger (`prevent_role_escalation`) blocks any non-admin from modifying `role` or `status` columns.
- The `identity-docs` storage bucket is private. Access is logged in the `audit_storage_access` table per the Data Privacy Act of 2012.
- Run `security_hardening_rls.sql` in the Supabase SQL Editor to apply all policies.

---

## Deployment Checklist

Before each production release:

- [ ] No `.env*` files in git staging (`git status`)
- [ ] All secrets in Vercel/hosting environment variables
- [ ] `security_hardening_rls.sql` applied to production Supabase project
- [ ] Edge Functions deployed: `approve-user`, `change-user-status`, `submit-public-report`
- [ ] Run `scripts/verify_security.sql` in Supabase SQL Editor — all 4 tests must pass
- [ ] Daily backup cron job active (`scripts/backup_db.sh`)
