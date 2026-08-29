#!/usr/bin/env node
/**
 * Build the site against `tests/fixtures/content/` (synthetic edge-case docs —
 * never real content), then serve it — the one command Playwright's
 * `webServer` runs (`playwright.config.ts`).
 *
 * The switch is `DOCS_CONTENT_DIR`, read by `src/content.config.ts` — mirrors
 * `packages/frontend/packages/web/tests/fixture-site.mjs`'s `W6W_APPS_DIR`
 * switch exactly, same reasoning: a normal `pnpm build`/`pnpm dev` never sets
 * this var, so it reads the real `content/` untouched.
 *
 * CONTAINER ARM. This devcontainer's compose service runs as root over the
 * bind mount, so a host-side `astro build` can die with `EACCES` on a
 * root-owned `.astro/`/`node_modules/.vite/` from a previous in-container
 * build — same trap `frontend`'s own fixture-site.mjs documents. Probe for
 * write access and shell into the `docs` compose service when the host can't.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DOCS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(DOCS_DIR, "dist-test");
const CONTENT_DIR = "./tests/fixtures/content";
const PORT = Number(process.env.DOCS_TEST_PORT ?? 4330);

function hostCanBuild() {
  for (const dir of [".astro", "node_modules/.vite"]) {
    const full = path.join(DOCS_DIR, dir);
    if (!fs.existsSync(full)) continue; // Astro will create it; the parent is ours.
    try {
      fs.accessSync(full, fs.constants.W_OK);
    } catch {
      return false;
    }
  }
  return true;
}

function build() {
  const args = ["--outDir", "dist-test"];
  const onHost = hostCanBuild();
  const step = onHost
    ? {
        cmd: "./node_modules/.bin/astro",
        args: ["build", ...args],
        cwd: DOCS_DIR,
        env: { ...process.env, DOCS_CONTENT_DIR: CONTENT_DIR },
      }
    : {
        cmd: "docker",
        args: [
          "compose",
          "-f",
          path.join(DOCS_DIR, "../../.devcontainer/docker-compose.yml"),
          "exec",
          "-T",
          "-e",
          `DOCS_CONTENT_DIR=${CONTENT_DIR}`,
          "docs",
          "sh",
          "-c",
          `cd /app/packages/docs && ./node_modules/.bin/astro build ${args.join(" ")}`,
        ],
        cwd: DOCS_DIR,
        env: process.env,
      };

  console.log(`[fixture-site] building dist-test from ${CONTENT_DIR} (${onHost ? "host" : "container"})`);
  const res = spawnSync(step.cmd, step.args, { cwd: step.cwd, env: step.env, stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(
      `[fixture-site] build failed (exit ${res.status}). ` +
        (onHost ? "" : "The container arm was used — is the docs compose service up?"),
    );
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

/** A plain static server over `dist-test/` bytes — no `astro preview` re-config needed. */
function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0].split("#")[0]);
    const resolved = path.resolve(OUT_DIR, "." + url);
    if (!resolved.startsWith(OUT_DIR)) {
      res.writeHead(400).end("bad path");
      return;
    }
    let filePath = resolved;
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { "content-type": "text/plain" }).end("not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "content-type": TYPES[ext] ?? "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`[fixture-site] serving ${OUT_DIR} on http://127.0.0.1:${PORT}`);
  });
}

build();

if (!fs.existsSync(path.join(OUT_DIR, "index.html"))) {
  throw new Error(`[fixture-site] ${OUT_DIR}/index.html is missing — nothing to serve.`);
}
serve();
