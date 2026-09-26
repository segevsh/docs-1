#!/usr/bin/env node
// Generates `content/self-host-config-reference.md` from the host's own
// `packages/api/config.ts` (sibling repo, D18). Run it and commit the result —
// this is NOT an Astro-build-time step (out of scope by design: a generator
// that ran during `astro build` would make the published page a function of
// whatever the sibling `server` checkout happens to be at build time, never a
// reviewable diff).
//
// EGRESS NOTE (T4.1.1, band: egress): `config.ts`'s own JSDoc is INTERNAL
// prose — several of its comments carry task ids, `D-`/`R-` decision
// rulings and project ids. This script never copies that prose. Every
// variable's description below is authored HERE, by hand, specifically for
// a public reader, and reviewed for internal references the same way the
// rest of this page is. The one thing this script reads out of `config.ts`
// mechanically is the SET OF VARIABLE NAMES it declares
// (`Deno.env.get("NAME")`), so the page can never silently fall behind a
// `config.ts` change: a newly added variable that isn't accounted for below
// (documented or excluded) fails the generator loudly rather than shipping
// an incomplete page.
//
// Deterministic: no timestamps, no environment-dependent values, no network
// access. Re-running against the same `config.ts` produces byte-identical
// output — `node scripts/gen-config-reference.mjs && git diff --exit-code
// content/self-host-config-reference.md` is exactly this invariant.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// Sibling layout: docs/scripts/../../server/packages/api/config.ts —
// resolved off this file's own location, not the invoking shell's cwd, so
// `node scripts/gen-config-reference.mjs` behaves the same run from anywhere.
const CONFIG_PATH = path.resolve(SCRIPT_DIR, "..", "..", "server", "packages", "api", "config.ts");
const OUT_PATH = path.resolve(SCRIPT_DIR, "..", "content", "self-host-config-reference.md");

/**
 * Variables `config.ts` reads that make sense only for OUR OWN cloud
 * installation and have no self-host reading at all — each with a reason a
 * self-host operator can act on (mainly: "leave it unset"). Every other name
 * `config.ts` reads must appear in {@link SECTIONS} below, or `main()` refuses
 * to generate anything (the completeness invariant A4 relies on).
 */
const EXCLUDED_VARS = [
  { name: "GITHUB_FRONTEND_DISPATCH_TOKEN", reason: "cloud-only: dispatches a GitHub Actions workflow on our own frontend repo; the machine-to-machine edge this configures is not part of a self-host install" },
  { name: "GITHUB_FRONTEND_REPO", reason: "cloud-only: paired with GITHUB_FRONTEND_DISPATCH_TOKEN above" },
  { name: "GITHUB_FRONTEND_WORKFLOW", reason: "cloud-only: paired with GITHUB_FRONTEND_DISPATCH_TOKEN above" },
  { name: "GITHUB_FRONTEND_REF", reason: "cloud-only: paired with GITHUB_FRONTEND_DISPATCH_TOKEN above" },
  { name: "FRONTEND_DEPLOY_DEDUPE_SEC", reason: "cloud-only: paired with GITHUB_FRONTEND_DISPATCH_TOKEN above" },
];

/**
 * Every documented variable, grouped for the page. `default` is the literal
 * fallback `config.ts` itself falls back to when the name is unset — quoted
 * as a short phrase rather than the exact source literal for the one case
 * (`JWT_SECRET`) where the literal is an obviously-fake but still
 * copy-pasteable secret string; naming it "a dev default" instead costs
 * nothing and matches how the internal operator guide treats the same field.
 */
const SECTIONS = [
  {
    heading: "Operator login and sessions",
    vars: [
      { name: "AUTH_USERNAME", default: "`admin`", description: "The operator login used to sign in and manage the app registry." },
      { name: "AUTH_PASSWORD", default: "`admin`", description: "The operator's password. Outside development mode the server refuses to start if this is unset or left at the default." },
      { name: "JWT_SECRET", default: "a dev default — never use it in production", description: "Signs the session tokens this host mints. Must differ from `OPS_JWT_SECRET`, or the server refuses to start." },
      { name: "AUTH_TOKEN_TTL_SEC", default: "86400", description: "How long a signed-in session stays valid." },
      { name: "AUTH_EXCHANGE_TTL_SEC", default: "900", description: "Lifetime of a token minted for one of your own end users through the token-exchange endpoint." },
      { name: "AUTH_IMPERSONATION_TTL_SEC", default: "same as AUTH_EXCHANGE_TTL_SEC", description: "Lifetime of an operator impersonation session." },
      { name: "TENANT_SECRET_ROTATION_OVERLAP_SEC", default: "86400", description: "How long a just-rotated tenant client secret keeps verifying, so an in-flight rotation never breaks a caller mid-request." },
      { name: "SIGNUP_MODE", default: "invite-only", description: "Whether an uninvited visitor can self-serve sign up. Only the exact value `open` allows it; anything else, including unset, keeps signup invite-only." },
      { name: "SIGNUP_TENANT", default: "`w6w`", description: "Which tenant a fresh signup, or a request that names none, lands in." },
      { name: "INVITE_TTL_SEC", default: "86400", description: "How long an account invite stays valid." },
      { name: "OPS_JWT_SECRET", default: "unset", description: "Signs a separate machine-to-machine edge this host does not mount on a self-host install. Leave it unset; it is still checked at boot for a collision with `JWT_SECRET`." },
    ],
  },
  {
    heading: "Process and storage",
    vars: [
      { name: "API_PORT", default: "8787", description: "The port the server listens on." },
      { name: "APPS_STORAGE_DIR", default: "`./storage/apps`", description: "Where app and asset files are read from. A published self-host image points this at its own baked-in app catalog." },
    ],
  },
  {
    heading: "Public URLs and Studio",
    vars: [
      { name: "PUBLIC_BASE_URL", default: "the local API address", description: "The public origin this API is served at, with no path prefix. An exposed Endpoint's callable URL is rendered against it, so set this to your real origin or operators will see `localhost` URLs." },
      { name: "WEBHOOK_BASE_URL", default: "the local API address", description: "URL template inbound webhook triggers are built from, with an `{id}` placeholder." },
      { name: "STUDIO_BASE_URL", default: "`http://localhost:5173`", description: "Studio's own origin, used to build links such as invite redemption." },
      { name: "SERVE_STUDIO", default: "off", description: "Serve a built Studio bundle from this same process at `/`, instead of running Studio as its own deployment." },
      { name: "STUDIO_DIST_DIR", default: "`../studio/dist`", description: "Where the built Studio bundle lives. Only read when `SERVE_STUDIO` is on." },
    ],
  },
  {
    heading: "Scheduling and execution",
    vars: [
      { name: "SCHEDULER_ENABLED", default: "on", description: "Whether this replica runs the in-process cron scheduler. Every scheduled job is a database-wide advisory-lock singleton, so more than one replica sharing a database never double-fires regardless of this flag." },
      { name: "RUN_CONCURRENCY_PER_REPLICA", default: "5", description: "How many workflow runs this one replica executes at once." },
      { name: "REPLICA_ID", default: "generated", description: "A stable id for this replica, used in claims and logs." },
    ],
  },
  {
    heading: "System mail (optional)",
    vars: [
      { name: "MAIL_FROM", default: "unset", description: "Envelope `From` address for the one system-sent email (an invite notification). Leaving this or `POSTMARK_SERVER_TOKEN` unset means no system mail is configured; the server still boots." },
      { name: "POSTMARK_SERVER_TOKEN", default: "unset", description: "Postmark API token for the one system-sent email. Paired with `MAIL_FROM` above." },
    ],
  },
  {
    heading: "Tenancy",
    vars: [
      { name: "TENANT_DOMAIN_SUFFIX", default: "unset", description: "A DNS zone used to suggest a per-tenant domain. Unset means the suggestion route does not exist at all; serving a tenant's own domain still needs your own DNS, TLS and ingress either way." },
      { name: "SYSTEM_DOCUMENTS_PROJECT", default: "unset", description: "Overrides which project the host's built-in system documents (such as the one-time login code email template) are resolved from. Leave it unset for the default lookup." },
    ],
  },
  {
    heading: "The control link and licence",
    vars: [
      { name: "W6W_INSTALLATION_MODE", default: "set by the entrypoint", description: "Which profile this process boots as. A published self-host image sets this itself; leave it unset, since a contradicting value refuses to boot." },
      { name: "W6W_EDGES", default: "the fixed self-host set", description: "Which API surfaces this process serves. A self-host install always serves exactly the same three; leave it unset." },
      { name: "W6W_CONTROL_URL", default: "unset — link off", description: "Base URL of the control plane. With it unset the install is fully local: no licence fetch, usage report or commerce call is ever made." },
      { name: "W6W_CONTROL_PUBLIC_KEY", default: "unset — trusts nothing", description: "The vendor's public key (a JWK, or a JSON array of them) this host trusts for licence documents. Without it, every licence — fetched or from a file — is ignored." },
      { name: "W6W_LICENCE_FILE", default: "unset", description: "Path to an offline licence file (one signed document). Re-read on every poll tick, so replacing the file takes effect without a restart." },
      { name: "W6W_USAGE_REPORTING", default: "off", description: "Turns on hourly usage reporting to the control plane. Self-host is opt-in; only an explicit \"on\" value enables it." },
    ],
  },
  {
    heading: "App catalog",
    vars: [
      { name: "W6W_IMPORT_PACK", default: "unset", description: "Set to the exact value `official` to import the baked-in first-party app pack automatically at boot. Otherwise import it later, on demand." },
    ],
  },
];

function extractConfigVars(source) {
  const names = new Set();
  const pattern = /Deno\.env\.get\("([A-Z0-9_]+)"\)/g;
  for (const match of source.matchAll(pattern)) names.add(match[1]);
  return names;
}

function render(sections) {
  const lines = [];
  lines.push("---");
  lines.push('title: "Self-host configuration reference"');
  lines.push(
    'description: "Every environment variable a self-host install reads, generated from the host\'s own config module."',
  );
  lines.push("---");
  lines.push("");
  lines.push("# Self-host configuration reference");
  lines.push("");
  lines.push(
    "Generated from the host's own configuration module, so this list can never drift from " +
      "what the code actually reads. See [Install](/self-hosting/install/) for the compose " +
      "bundle that sets the handful of these you must supply yourself, and " +
      "[Troubleshooting](/self-hosting/troubleshooting/) for what happens when one of these is " +
      "wrong.",
  );
  lines.push("");
  for (const section of sections) {
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push("| Variable | Default | What it does |");
    lines.push("| --- | --- | --- |");
    for (const v of section.vars) {
      lines.push(`| \`${v.name}\` | ${v.default} | ${v.description} |`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

function main() {
  const source = readFileSync(CONFIG_PATH, "utf8");
  const found = extractConfigVars(source);

  const documented = new Set(SECTIONS.flatMap((s) => s.vars.map((v) => v.name)));
  const excluded = new Set(EXCLUDED_VARS.map((v) => v.name));

  const unaccounted = [...found].filter((v) => !documented.has(v) && !excluded.has(v));
  if (unaccounted.length > 0) {
    console.error(
      `gen-config-reference: config.ts reads variable(s) neither documented nor excluded: ${
        unaccounted.join(", ")
      }`,
    );
    process.exitCode = 1;
    return;
  }

  const stale = [...documented, ...excluded].filter((v) => !found.has(v));
  if (stale.length > 0) {
    console.error(
      `gen-config-reference: documented/excluded variable(s) no longer read by config.ts: ${
        stale.join(", ")
      }`,
    );
    process.exitCode = 1;
    return;
  }

  writeFileSync(OUT_PATH, render(SECTIONS));
  console.log(`gen-config-reference: wrote ${OUT_PATH} (${found.size} variables accounted for)`);
}

main();
