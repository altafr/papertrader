#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
assignment_pattern='(ALPACA_(API|SECRET)_KEY|CLERK_SECRET_KEY|DATABASE_URL)[[:space:]]*=[[:space:]]*(?!\$|<|>|\{)[^[:space:]]{8,}'
found=0

scan_assignments() {
  local directory="$1"
  local hits
  hits="$(rg -l --pcre2 --hidden --glob '!.git/**' --glob '!node_modules/**' --glob '!apps/web/.next/**' "$assignment_pattern" "$directory" 2>/dev/null || true)"
  if [[ -n "$hits" ]]; then
    printf '%s\n' "$hits"
    found=1
  fi
}

scan_assignments "$repo_root"

static_dir="$repo_root/apps/web/.next/static"
if [[ -d "$static_dir" ]]; then
  browser_hits="$(rg -l --pcre2 '(postgres(?:ql)?://|sk_(?:live|test)_[A-Za-z0-9])' "$static_dir" 2>/dev/null || true)"
  if [[ -n "$browser_hits" ]]; then
    printf '%s\n' "$browser_hits"
    found=1
  fi
fi

if [[ "$found" -ne 0 ]]; then
  echo "Secret-surface audit failed: credential-like values were found." >&2
  exit 1
fi

echo "Secret-surface audit passed: no credential-like values found in source or browser output."
