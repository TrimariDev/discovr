import type { ExplainEdgeResponse, GraphEdge, GraphSnapshot } from "@discovr/contracts";
import { findCachedGraphContainingNodes, getCached } from "./cache.js";

function normalizeArtistId(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function graphCacheKey(seedId: string, depth: number, limit: number) {
  return `graph:${seedId}:${depth}:${limit}:v6-fast`;
}

function findEdge(source: string, target: string, edges: GraphEdge[]) {
  return edges.find(
    (edge) =>
      (edge.source === source && edge.target === target) || (edge.source === target && edge.target === source)
  );
}

function sharedTags(left: string[], right: string[]) {
  const rightTags = new Set(right.map((tag) => tag.trim().toLowerCase()).filter(Boolean));
  return left.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag && rightTags.has(tag));
}

function findGraphSnapshot(source: string, target: string, seed?: string): GraphSnapshot | null {
  if (seed) {
    const seedId = normalizeArtistId(seed);
    const keyed = getCached<GraphSnapshot>(graphCacheKey(seedId, 1, 100));

    if (keyed?.nodes.some((node) => node.id === source) && keyed.nodes.some((node) => node.id === target)) {
      return keyed;
    }
  }

  return findCachedGraphContainingNodes(source, target);
}

export function explainEdge(input: {
  source: string;
  target: string;
  seed?: string;
}): ExplainEdgeResponse | null {
  const source = normalizeArtistId(input.source);
  const target = normalizeArtistId(input.target);

  if (!source || !target || source === target) {
    return null;
  }

  const graph = findGraphSnapshot(source, target, input.seed);
  const reasons: string[] = [];
  let score = 0;

  const sourceTags =
    graph?.nodes.find((node) => node.id === source)?.tags ??
    getCached<string[]>(`artist-tags:${source}`) ??
    [];
  const targetTags =
    graph?.nodes.find((node) => node.id === target)?.tags ??
    getCached<string[]>(`artist-tags:${target}`) ??
    [];

  const overlap = sharedTags(sourceTags, targetTags);

  if (graph) {
    const edge = findEdge(source, target, graph.edges);
    const sourceNode = graph.nodes.find((node) => node.id === source);
    const targetNode = graph.nodes.find((node) => node.id === target);

    if (edge) {
      score = Math.max(score, edge.weight);

      if (edge.label === "shared tags") {
        reasons.push("Connected by shared Last.fm tags in this graph");
      } else {
        reasons.push("Direct Last.fm similarity link in this graph");

        if (source === graph.meta.seedArtistId || target === graph.meta.seedArtistId) {
          reasons.push("Similar artist of the current seed");
        }
      }
    }

    if (sourceNode && targetNode && sourceNode.community === targetNode.community) {
      const community = graph.communities.find((entry) => entry.id === sourceNode.community);
      reasons.push(
        community?.label ? `Same detected community (${community.label})` : "Same detected community (Leiden)"
      );
    }
  }

  if (overlap.length > 0) {
    score = Math.max(score, Math.min(1, overlap.length / 4));
    reasons.push(`Shared tags: ${overlap.slice(0, 6).join(", ")}`);
  }

  if (reasons.length === 0) {
    return null;
  }

  return {
    score: Number(score.toFixed(3)),
    reasons
  };
}
