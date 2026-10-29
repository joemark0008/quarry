#!/usr/bin/env bash
# Runs apps/api in proxy-split mode (docs/proxy-split.md): same database and auth secret as the upstream backend.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM_ENV="$ROOT/../fork-reference/.env"

if [[ ! -f "$UPSTREAM_ENV" ]]; then
	echo "Missing $UPSTREAM_ENV (needed for the shared BETTER_AUTH_SECRET)" >&2
	exit 1
fi

export DATABASE_URL="${SPLIT_DATABASE_URL:-postgresql://quarry:quarry@localhost:5434/nao_baseline}"
export BETTER_AUTH_SECRET="$(grep '^BETTER_AUTH_SECRET=' "$UPSTREAM_ENV" | cut -d= -f2-)"
export BETTER_AUTH_URL="${SPLIT_FRONTEND_URL:-http://localhost:3000}"

echo "apps/api split mode: database nao_baseline, frontend origin $BETTER_AUTH_URL"
cd "$ROOT"
exec npm run dev -w @quarry/api
