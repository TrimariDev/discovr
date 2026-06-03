import { getSimilarArtists, searchArtists } from "./lastfm.js";
import {
  titleCaseArtistName,
  type GraphCommunity,
  type GraphEdge,
  type GraphNode,
  type ArtistSearchResult,
  type GraphSnapshot
} from "@discovr/contracts";
import { getCached, setCached } from "./cache.js";
import {
  analyzeGraphWithWorker,
  applyWorkerAnalysis,
  buildWorkerAnalyzeRequest
} from "./graphWorker.js";
import { enrichArtistTags } from "./tagEnrichment.js";
import { buildTagSimilarityEdges } from "./tagSimilarityEdges.js";

const graphCacheTtlMs = 1000 * 60 * 30;
const popularArtistHints = [
  "Radiohead",
  "The Rolling Stones",
  "Ron Wood",
  "Roxy Music",
  "Robbie Williams",
  "Rod Stewart",
  "Röyksopp",
  "Rosalía",
  "R.E.M.",
  "Red Hot Chili Peppers",
  "The Beatles",
  "David Bowie",
  "Pink Floyd",
  "Nirvana",
  "The Smiths",
  "Thom Yorke",
  "Fleetwood Mac",
  "Bob Dylan",
  "The Strokes",
  "Arctic Monkeys"
];

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function isEchoOfQuery(artistName: string, artistId: string, query: string) {
  const normalizedQuery = normalizeName(query);

  if (!normalizedQuery) {
    return false;
  }

  const normalizedName = normalizeName(artistName);
  const normalizedId = normalizeName(artistId);

  if (normalizedName === normalizedQuery || normalizedId === normalizedQuery) {
    return true;
  }

  const compact = (value: string) => value.replace(/[^a-z0-9]+/g, "");

  return (
    compact(normalizedName) === compact(normalizedQuery) ||
    compact(normalizedId) === compact(normalizedQuery)
  );
}

function stableNoise(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function imageUrlFromLastFm(images: Array<{ "#text": string; size: string }> | undefined) {
  return images?.find((image) => image.size === "extralarge")?.["#text"] ||
    images?.find((image) => image.size === "large")?.["#text"] ||
    images?.find((image) => image["#text"])?.["#text"] ||
    null;
}

/** Name (or a word in it) must start with the full typed query — "Beatl" matches "Beatles", not "Beats". */
function matchesQueryPrefix(candidate: string, query: string) {
  return fuzzyScore(query, candidate) <= 1;
}

function fuzzyScore(query: string, candidate: string) {
  const normalizedQuery = normalizeName(query);
  const normalizedCandidate = normalizeName(candidate);
  const words = normalizedCandidate.split(/\s+/);

  if (normalizedCandidate === normalizedQuery) {
    return 0;
  }

  if (normalizedCandidate.startsWith(normalizedQuery) || words.some((word) => word.startsWith(normalizedQuery))) {
    return 1;
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return 2;
  }

  return 3;
}

function targetPositionForArtist(input: {
  artistName: string;
  index: number;
  weight: number;
}) {
  const normalizedWeight = Math.max(0, Math.min(1, input.weight));
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const nameNoise = stableNoise(input.artistName);
  const secondaryNoise = stableNoise(`${input.artistName}:${input.index}`);
  const angle = input.index * goldenAngle + nameNoise * 0.85;
  const distance = 0.18 + (1 - normalizedWeight) * 0.78;
  const jitter = (secondaryNoise - 0.5) * 0.08;
  const radius = Math.min(1.08, distance + jitter);

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  };
}

export async function bootstrapArtistSearch(query: string): Promise<ArtistSearchResult[]> {
  const normalized = normalizeName(query);
  const cachedResults = getCached<ArtistSearchResult[]>(`artist-search:${normalized}`);

  if (cachedResults) {
    return cachedResults.filter(
      (artist) => !isEchoOfQuery(artist.name, artist.id, query) && matchesQueryPrefix(artist.name, query)
    );
  }

  const lastFmResults = await searchArtists({ query, limit: 20 });
  const hintResults = popularArtistHints
    .filter((name) => matchesQueryPrefix(name, query))
    .map((name) => ({
      name,
      mbid: undefined,
      image: undefined,
      listeners: "999999999"
    }));
  const seen = new Set<string>();
  const scored = [...hintResults, ...lastFmResults]
    .filter((artist) => artist.name?.trim())
    .map((artist) => ({
      artist,
      normalizedName: normalizeName(artist.name),
      score: fuzzyScore(query, artist.name),
      listeners: Number(artist.listeners ?? 0),
      hasMbid: Boolean(artist.mbid)
    }))
    .filter((item) => {
      if (seen.has(item.normalizedName)) {
        return false;
      }

      seen.add(item.normalizedName);
      return true;
    })
    .filter((item) => item.score <= 1)
    .sort((left, right) => left.score - right.score || right.listeners - left.listeners);

  // Last.fm "artist.search" can return low-quality pseudo-artists (often album-like titles).
  // Filter aggressively using popularity, but always keep MBID-backed artists.
  const maxListeners = scored.reduce((max, item) => Math.max(max, item.listeners), 0);
  const minListeners = Math.max(20000, Math.floor(maxListeners * 0.02));

  const results = scored
    .filter((item) => item.hasMbid || item.listeners >= minListeners)
    .filter(
      ({ artist }) =>
        !isEchoOfQuery(artist.name, normalizeName(artist.name), query)
    )
    .slice(0, 8)
    .map(({ artist }) => ({
      id: normalizeName(artist.name),
      name: artist.name,
      mbid: artist.mbid || null,
      imageUrl: imageUrlFromLastFm(artist.image),
      tags: []
    }));

  setCached(`artist-search:${normalized}`, results, 1000 * 60 * 10);
  return results;
}

function buildSeedAndSimilarNodes(
  seedName: string,
  similarArtists: Awaited<ReturnType<typeof getSimilarArtists>>
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const seedId = normalizeName(seedName);

  const edges = similarArtists.map((artist) => {
    const weight = Number(artist.match ?? 0);

    return {
      id: `${seedId}-${normalizeName(artist.name)}`,
      source: seedId,
      target: normalizeName(artist.name),
      weight,
      label: weight.toFixed(2)
    };
  });

  const nodes: GraphNode[] = [
    {
      id: seedId,
      label: titleCaseArtistName(seedName),
      name: seedName,
      x: 0,
      y: 0,
      size: 18,
      community: 0,
      tags: [],
      imageUrl: null
    },
    ...similarArtists.map((artist, index) => {
      const weight = Number(artist.match ?? 0);
      const position = targetPositionForArtist({
        artistName: artist.name,
        index,
        weight
      });

      return {
        id: normalizeName(artist.name),
        label: titleCaseArtistName(artist.name),
        name: artist.name,
        x: position.x,
        y: position.y,
        size: 8 + weight * 8,
        community: index % 6,
        tags: [],
        imageUrl: imageUrlFromLastFm(artist.image)
      };
    })
  ];

  return { nodes, edges };
}

function buildDeterministicCommunities(nodes: GraphNode[]): GraphCommunity[] {
  const communityIds = [...new Set(nodes.map((node) => node.community))].sort((left, right) => left - right);

  return communityIds.map((communityId) => ({
    id: communityId,
    label: communityId === 0 ? "Seed neighborhood" : `Similarity cluster ${communityId}`,
    topTags: []
  }));
}

export async function buildArtistGraph(input: { artistId: string; depth: number; limit: number }): Promise<GraphSnapshot> {
  const depth = input.depth || 1;
  const limit = Math.min(Math.max(input.limit || 100, 1), 100);
  const seedName = input.artistId;
  const seedId = normalizeName(seedName);
  const cacheKey = `graph:${seedId}:${depth}:${limit}:v6-fast`;
  const cachedGraph = getCached<GraphSnapshot>(cacheKey);

  if (cachedGraph) {
    return cachedGraph;
  }

  const similarArtists = await getSimilarArtists({
    artistName: seedName,
    limit
  });

  let { nodes, edges } = buildSeedAndSimilarNodes(seedName, similarArtists);
  let communities = buildDeterministicCommunities(nodes);
  let algorithm = "match-radial";

  const workerAnalysis = await analyzeGraphWithWorker(
    buildWorkerAnalyzeRequest({ seedArtistId: seedId, nodes, edges })
  );

  if (workerAnalysis) {
    const positioned = applyWorkerAnalysis(nodes, workerAnalysis);
    nodes = positioned.nodes;
    communities = positioned.communities;
    algorithm = "match-radial+leiden-communities";
  }

  const graph: GraphSnapshot = {
    status: "ready",
    graphId: `memory-${seedId}-${Date.now()}`,
    nodes,
    edges,
    communities,
    meta: {
      seedArtistId: seedId,
      depth,
      limit,
      algorithm
    }
  };

  setCached(cacheKey, graph, graphCacheTtlMs);
  return graph;
}

/** Tags, tag-similarity edges, and Leiden — run after the fast graph is shown. */
export async function enrichGraphStructure(graph: GraphSnapshot) {
  const seedId = graph.meta.seedArtistId;

  const tagsByArtistId = await enrichArtistTags(
    graph.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      mbid: null
    }))
  );

  let nodes = graph.nodes.map((node) => ({
    ...node,
    tags: tagsByArtistId[node.id] ?? []
  }));

  const starEdges = graph.edges.filter((edge) => edge.source === seedId || edge.target === seedId);
  const tagEdges = buildTagSimilarityEdges(tagsByArtistId);
  const edges = [...starEdges, ...tagEdges];

  let communities = graph.communities;
  let algorithm = tagEdges.length > 0 ? "match-radial+tag-edges" : graph.meta.algorithm;

  const workerAnalysis = await analyzeGraphWithWorker(
    buildWorkerAnalyzeRequest({ seedArtistId: seedId, nodes, edges })
  );

  if (workerAnalysis) {
    const positioned = applyWorkerAnalysis(nodes, workerAnalysis);
    nodes = positioned.nodes;
    communities = positioned.communities;
    algorithm = tagEdges.length > 0 ? "match-radial+tag-edges+leiden" : "match-radial+leiden-communities";
  }

  const enrichedSnapshot: GraphSnapshot = {
    ...graph,
    nodes,
    edges,
    communities,
    meta: { ...graph.meta, algorithm }
  };

  setCached(
    `graph:${seedId}:${graph.meta.depth}:${graph.meta.limit}:v6-fast`,
    enrichedSnapshot,
    graphCacheTtlMs
  );

  return {
    tagsByArtistId,
    nodes,
    edges,
    communities,
    algorithm
  };
}
