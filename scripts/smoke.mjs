#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");

    for (const line of raw.split("\n")) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");

      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional .env
  }
}

loadEnvFile();

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const workerBase = process.env.GRAPH_WORKER_URL ?? "http://localhost:8000";
const lastFmKey = process.env.LASTFM_API_KEY?.trim();

let failed = 0;

async function check(name, run) {
  try {
    await run();
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${name}: ${message}`);
  }
}

await check("API health", async () => {
  const response = await fetch(`${apiBase}/health`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const body = await response.json();

  if (body.status !== "ok" || body.service !== "discovr-api") {
    throw new Error("Unexpected health payload");
  }
});

await check("Graph worker health", async () => {
  const response = await fetch(`${workerBase}/health`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const body = await response.json();

  if (body.status !== "ok") {
    throw new Error("Unexpected worker health payload");
  }
});

if (!lastFmKey) {
  console.log("○ Skipping Last.fm checks (LASTFM_API_KEY not set)");
} else {
  await check("Artist search", async () => {
    const response = await fetch(`${apiBase}/api/artists/search?q=beatles`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();

    if (!Array.isArray(body.results) || body.results.length === 0) {
      throw new Error("Expected search results");
    }
  });

  await check("Artist graph", async () => {
    const response = await fetch(`${apiBase}/api/graphs/artist/the%20beatles?depth=1&limit=20`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();

    if (body.status !== "ready" || body.nodes.length === 0) {
      throw new Error("Expected ready graph with nodes");
    }
  });

  await check("Edge explain (cached graph)", async () => {
    const graphResponse = await fetch(`${apiBase}/api/graphs/artist/the%20beatles?depth=1&limit=20`);
    const graph = await graphResponse.json();

    if (!graph.nodes?.[0] || !graph.nodes?.[1]) {
      throw new Error("Graph needs at least two nodes");
    }

    const source = graph.meta.seedArtistId;
    const target = graph.nodes.find((node) => node.id !== source)?.id;

    const url = new URL(`${apiBase}/api/edges/explain`);
    url.searchParams.set("source", source);
    url.searchParams.set("target", target);
    url.searchParams.set("seed", "the beatles");

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();

    if (typeof body.score !== "number" || !Array.isArray(body.reasons) || body.reasons.length === 0) {
      throw new Error("Expected score and reasons");
    }
  });
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`\n${failed} smoke check(s) failed`);
} else {
  console.log("\nAll smoke checks passed");
}
