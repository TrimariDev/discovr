import type { GraphSnapshot } from "@/lib/types";

/** Default graph query params — keep in sync with API cache keys. */
export const GRAPH_DEFAULT_DEPTH = 1;
export const GRAPH_DEFAULT_LIMIT = 100;

function pendingMeta(seedArtistId: string | null, algorithm: string): GraphSnapshot["meta"] {
  return {
    seedArtistId,
    depth: GRAPH_DEFAULT_DEPTH,
    limit: GRAPH_DEFAULT_LIMIT,
    algorithm
  };
}

export function createIdleGraph(): GraphSnapshot {
  return {
    status: "idle",
    graphId: null,
    nodes: [],
    edges: [],
    communities: [],
    meta: pendingMeta(null, "pending")
  };
}

export function createLoadingGraph(seedArtistId: string): GraphSnapshot {
  return {
    status: "loading",
    graphId: null,
    nodes: [],
    edges: [],
    communities: [],
    meta: pendingMeta(seedArtistId, "loading")
  };
}

export function createErrorGraph(seedArtistId: string): GraphSnapshot {
  return {
    status: "error",
    graphId: null,
    nodes: [],
    edges: [],
    communities: [],
    meta: pendingMeta(seedArtistId, "error")
  };
}
