import type { GraphCommunity, GraphEdge, GraphNode } from "@discovr/contracts";

export type GraphWorkerAnalyzeRequest = {
  seed_artist_id: string | null;
  nodes: Array<{
    id: string;
    name: string;
    tags: string[];
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
  }>;
};

export type GraphWorkerNodeAnalysis = {
  id: string;
  community: number;
  x: number;
  y: number;
  size: number;
};

export type GraphWorkerAnalyzeResponse = {
  nodes: GraphWorkerNodeAnalysis[];
  communities: GraphCommunity[];
};

const workerTimeoutMs = 15_000;

function workerBaseUrl() {
  return process.env.GRAPH_WORKER_URL?.trim() || "http://localhost:8001";
}

export async function analyzeGraphWithWorker(
  request: GraphWorkerAnalyzeRequest
): Promise<GraphWorkerAnalyzeResponse | null> {
  const baseUrl = workerBaseUrl();

  if (!baseUrl) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), workerTimeoutMs);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/graph/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    if (!response.ok) {
      console.warn(`Graph worker responded with ${response.status}`);
      return null;
    }

    const payload = (await response.json()) as GraphWorkerAnalyzeResponse;

    if (!Array.isArray(payload.nodes) || !Array.isArray(payload.communities)) {
      console.warn("Graph worker returned an invalid payload");
      return null;
    }

    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`Graph worker unavailable (${message}); using deterministic layout`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Apply worker output for communities only. Positions and sizes stay on the API side
 * (match-weighted radius + per-node size) so the map is not a symmetric FR star layout.
 */
export function applyWorkerAnalysis(
  nodes: GraphNode[],
  analysis: GraphWorkerAnalyzeResponse
): { nodes: GraphNode[]; communities: GraphCommunity[] } {
  const analysisById = new Map(analysis.nodes.map((node) => [node.id, node]));

  const positionedNodes = nodes.map((node) => {
    const positioned = analysisById.get(node.id);

    if (!positioned) {
      return node;
    }

    return {
      ...node,
      community: positioned.community
    };
  });

  const communities =
    analysis.communities.length > 0
      ? analysis.communities
      : [...new Set(positionedNodes.map((node) => node.community))]
          .sort((left, right) => left - right)
          .map((communityId) => ({
            id: communityId,
            label: communityId === 0 ? "Seed neighborhood" : `Cluster ${communityId}`,
            topTags: [] as string[]
          }));

  return { nodes: positionedNodes, communities };
}

export function buildWorkerAnalyzeRequest(input: {
  seedArtistId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}): GraphWorkerAnalyzeRequest {
  return {
    seed_artist_id: input.seedArtistId,
    nodes: input.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      tags: node.tags
    })),
    edges: input.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight
    }))
  };
}
