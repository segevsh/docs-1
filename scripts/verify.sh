#!/usr/bin/env bash
# The ONE list of checks for w6w-io/docs: the vendored-token guard, the importer/rail unit tests,
# the Astro type-check, the production build (into dist/, which deploy.yml then publishes) and the
# browser suite (its own fixture build into dist-test/). CI (.github/workflows/ci.yml) runs exactly
# this file, deploy.yml runs it as the gate before publishing, and so does the pre-push hook
# (w6w-io/w6w .githooks/pre-push). Add a check HERE, never only in a workflow.
# Needs no sibling repo: the site builds from the committed content/ snapshot. Needs network for
# check:tokens (it fetches w6w-io/w6w-branding's public tokens.css) and Playwright's chromium.
set -euo pipefail
cd "$(dirname "$0")/.."

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -lt 24 ]; then
  echo "verify: Node $(node --version) — CI runs Node 24; run w6w-io/w6w scripts/install-hooks.sh to fetch it" >&2
  exit 1
fi

step() { printf '\n== %s\n' "$*"; }
step "vendored tokens";  pnpm check:tokens
step "unit tests";       pnpm test
step "type-check";       pnpm check
step build;              pnpm build
step "browser suite";    pnpm test:e2e
printf '\nverify: ok\n'
