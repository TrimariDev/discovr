import type { ArtistSearchResult, GraphSnapshot } from "./types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function searchArtists(query: string): Promise<ArtistSearchResult[]> {
  const response = await fetch(`${apiBaseUrl}/api/artists/search?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error("Artist search failed");
  }

  const payload = (await response.json()) as { results: ArtistSearchResult[] };
  return payload.results;
}

export async function loadArtistGraph(artistId: string): Promise<GraphSnapshot> {
  const response = await fetch(`${apiBaseUrl}/api/graphs/artist/${encodeURIComponent(artistId)}?depth=1&limit=60`);

  if (!response.ok) {
    throw new Error("Graph load failed");
  }

  return (await response.json()) as GraphSnapshot;
}
