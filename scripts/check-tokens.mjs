#!/usr/bin/env node
// Verifies `src/styles/tokens.css`'s vendored body is byte-identical to the
// live `w6w-io/w6w-branding` `tokens/tokens.css`. See that file's own header
// for why this vendor-plus-guard shape exists in the first place (D-A,
// T2.1.1 contract) rather than an `@import` across the filesystem.
//
// A failed fetch is a FAILURE here, never a skip — a gate that passes when
// it cannot check is not a gate.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SOURCE_URL = "https://raw.githubusercontent.com/w6w-io/w6w-branding/main/tokens/tokens.css";
const LOCAL_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src/styles/tokens.css",
);

/**
 * Strip this file's own provenance header — a C-style comment block whose
 * closing line is a lone space, an asterisk, then a slash — leaving the
 * vendored body, which must be byte-identical to the live upstream file.
 */
function stripHeader(text) {
  const lines = text.split("\n");
  const end = lines.findIndex((line) => line === " */");
  if (end === -1) {
    throw new Error(`${LOCAL_PATH}: no provenance header found (expected a line " */")`);
  }
  return lines.slice(end + 1).join("\n");
}

function firstDiffSummary(local, remote) {
  const localLines = local.split("\n");
  const remoteLines = remote.split("\n");
  const max = Math.max(localLines.length, remoteLines.length);
  const out = [];
  for (let i = 0; i < max && out.length < 10; i++) {
    if (localLines[i] !== remoteLines[i]) {
      out.push(`  line ${i + 1}:`);
      out.push(`    local:  ${localLines[i] ?? "<missing>"}`);
      out.push(`    remote: ${remoteLines[i] ?? "<missing>"}`);
    }
  }
  if (localLines.length !== remoteLines.length) {
    out.push(`  (local has ${localLines.length} lines, remote has ${remoteLines.length})`);
  }
  return out.join("\n");
}

async function main() {
  let local;
  try {
    local = stripHeader(readFileSync(LOCAL_PATH, "utf8"));
  } catch (err) {
    console.error(`check-tokens: cannot read ${LOCAL_PATH}: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  let remote;
  try {
    const res = await fetch(SOURCE_URL);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    remote = await res.text();
  } catch (err) {
    console.error(`check-tokens: failed to fetch ${SOURCE_URL}: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  if (local !== remote) {
    console.error(
      "check-tokens: src/styles/tokens.css has drifted from w6w-io/w6w-branding's tokens/tokens.css",
    );
    console.error(firstDiffSummary(local, remote));
    process.exitCode = 1;
    return;
  }

  console.log(
    "check-tokens: OK — src/styles/tokens.css matches w6w-io/w6w-branding's tokens/tokens.css",
  );
}

await main();
