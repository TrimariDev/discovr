import { getSimilarArtists, searchArtists } from "./lastfm.js";
import type { ArtistSearchResult, GraphSnapshot } from "../types/graph.js";
import { getCached, setCached } from "./cache.js";

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
  return name.trim().toLowerCase();
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
  const bandOffset = (input.index % 4) * 0.035;
  const distance = 0.18 + (1 - normalizedWeight) * 0.78 + bandOffset;
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
    return cachedResults;
  }

  const lastFmResults = await searchArtists({ query, limit: 20 });
  const hintResults = popularArtistHints
    .filter((name) => fuzzyScore(query, name) < 3)
    .map((name) => ({
      name,
      mbid: undefined,
      image: undefined,
      listeners: "999999999"
    }));
  const seen = new Set<string>();
  const results = [...hintResults, ...lastFmResults]
    .filter((artist) => artist.name?.trim())
    .map((artist) => ({
      artist,
      normalizedName: normalizeName(artist.name),
      score: fuzzyScore(query, artist.name),
      listeners: Number(artist.listeners ?? 0)
    }))
    .filter((item) => {
      if (seen.has(item.normalizedName)) {
        return false;
      }

      seen.add(item.normalizedName);
      return true;
    })
    .sort((left, right) => left.score - right.score || right.listeners - left.listeners)
    .slice(0, 8)
    .map(({ artist }) => ({
      id: normalizeName(artist.name),
      name: artist.name,
      mbid: artist.mbid || null,
      imageUrl: imageUrlFromLastFm(artist.image),
      tags: []
    }));

  const finalResults = results.length > 0
    ? results
    : [{ id: normalized, name: query.trim(), mbid: null, imageUrl: null, tags: [] }];

  setCached(`artist-search:${normalized}`, finalResults, 1000 * 60 * 10);
  return finalResults;
}

export async function buildArtistGraph(input: { artistId: string; depth: number; limit: number }): Promise<GraphSnapshot> {
  const depth = input.depth || 1;
  const limit = Math.min(Math.max(input.limit || 60, 1), 100);
  const seedName = input.artistId;
  const cacheKey = `graph:${normalizeName(seedName)}:${depth}:${limit}`;
  const cachedGraph = getCached<GraphSnapshot>(cacheKey);

  if (cachedGraph) {
    return cachedGraph;
  }

  const similarArtists = await getSimilarArtists({
    artistName: seedName,
    limit
  });
  const nodes = [
    {
      id: normalizeName(seedName),
      label: seedName,
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
        label: artist.name,
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

  const edges = similarArtists.map((artist) => {
    const weight = Number(artist.match ?? 0);

    return {
      id: `${normalizeName(seedName)}-${normalizeName(artist.name)}`,
      source: normalizeName(seedName),
      target: normalizeName(artist.name),
      weight,
      label: weight.toFixed(2)
    };
  });

  const communityIds = [...new Set(nodes.map((node) => node.community))].sort((left, right) => left - right);
  const graph: GraphSnapshot = {
    status: "ready",
    graphId: `memory-${normalizeName(seedName)}-${Date.now()}`,
    nodes,
    edges,
    communities: communityIds.map((communityId) => ({
      id: communityId,
      label: communityId === 0 ? "Seed neighborhood" : `Similarity cluster ${communityId}`,
      topTags: []
    })),
    meta: {
      seedArtistId: normalizeName(seedName),
      depth,
      limit,
      algorithm: "deterministic-fallback"
    }
  };

  setCached(cacheKey, graph, graphCacheTtlMs);
  return graph;
}
