import { getSimilarArtists } from "./lastfm.js";
import type { ArtistSearchResult, GraphSnapshot } from "../types/graph.js";

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export async function bootstrapArtistSearch(query: string): Promise<ArtistSearchResult[]> {
  const normalized = normalizeName(query);

  return [
    {
      id: normalized,
      name: query.trim(),
      mbid: null,
      imageUrl: null,
      tags: []
    }
  ];
}

export async function buildArtistGraph(input: { artistId: string; depth: number; limit: number }): Promise<GraphSnapshot> {
  const seedName = input.artistId;
  const similarArtists = await getSimilarArtists({ artistName: seedName, limit: input.limit });
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
      const angle = (index / Math.max(similarArtists.length, 1)) * Math.PI * 2;
      const radius = 0.35 + (index % 5) * 0.12;

      return {
        id: normalizeName(artist.name),
        label: artist.name,
        name: artist.name,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: 8 + Number(artist.match ?? 0) * 8,
        community: index % 6,
        tags: [],
        imageUrl: artist.image?.find((image) => image.size === "large")?.["#text"] || null
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

  return {
    status: "ready",
    graphId: `snapshot-${normalizeName(seedName)}`,
    nodes,
    edges,
    communities: communityIds.map((communityId) => ({
      id: communityId,
      label: communityId === 0 ? "Seed neighborhood" : `Similarity cluster ${communityId}`,
      topTags: []
    })),
    meta: {
      seedArtistId: normalizeName(seedName),
      depth: input.depth,
      limit: input.limit,
      algorithm: "deterministic-fallback"
    }
  };
}
