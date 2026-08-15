#!/usr/bin/env bash
# Build the devquest external plugin against a local DSH install.
#
# Steps: locate the DSH install → link dev dependencies → compile src → lib
# (tsc emits lib/types; tsdown bundles lib/index.js + lib/client.js).
# Requires `dsh` on PATH (or --checkout <path>) and tsc/tsdown resolvable.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 1. Locate the DSH install and link dev dependencies
CHECKOUT=""
if [ "${1:-}" = "--checkout" ] && [ -n "${2:-}" ]; then
  CHECKOUT="$2"
fi

node scripts/setup-dsh-deps.mjs ${CHECKOUT:+--checkout "$CHECKOUT"}

TSC=""
TSDOWN=""
if [ -n "$CHECKOUT" ]; then
  TSC="$CHECKOUT/node_modules/.bin/tsc"
  TSDOWN="$CHECKOUT/node_modules/.bin/tsdown"
elif command -v tsc >/dev/null 2>&1; then
  TSC="$(command -v tsc)"
fi
if command -v tsdown >/dev/null 2>&1; then
  TSDOWN="$(command -v tsdown)"
fi
if [ -z "$TSC" ] || [ -z "$TSDOWN" ] || [ ! -x "$TSC" ] || [ ! -x "$TSDOWN" ]; then
  echo "build: tsc/tsdown not found (install typescript + tsdown as devDependencies, or pass --checkout with a full DSH install)" >&2
  exit 1
fi

echo "=== Compiling src → lib (tsc $("$TSC" --version)) ==="
"$TSC" -p tsconfig.json

echo "=== Bundling host + client (tsdown) ==="
"$TSDOWN" -c tsdown.config.ts --tsconfig tsconfig.down.json

echo "=== Build complete ==="
ls -la lib/ lib/types/ | head -12
