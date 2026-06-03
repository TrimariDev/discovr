import type {
  ArtistInfoResponse,
  ArtistSearchResponse,
  ArtistSearchResult,
  GetArtistGraphResponse,
  GraphStructureEnrichmentRequest,
  GraphTagsEnrichmentRequest,
  PostGraphEnrichResponse,
  PostGraphTagsResponse
} from "@discovr/contracts";
import {
  isApiErrorResponse,
  isArtistInfoResponse,
  isArtistSearchResponse,
  isGraphSnapshot,
  isGraphStructureEnrichmentResponse,
  isGraphTagsEnrichmentResponse
} from "@discovr/contracts";
import { GRAPH_DEFAULT_DEPTH, GRAPH_DEFAULT_LIMIT } from "@/lib/graph-snapshot";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function readApiError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (isApiErrorResponse(body)) {
      return body.error.message;
    }
  } catch {
    // ignore parse errors
  }

  return response.statusText || "Request failed";
}

export async function searchArtists(query: string): Promise<ArtistSearchResult[]> {
  const response = await fetch(`${apiBaseUrl}/api/artists/search?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload: unknown = await response.json();

  if (!isArtistSearchResponse(payload)) {
    throw new Error("Invalid artist search response");
  }

  return payload.results;
}

export async function loadArtistGraph(artistId: string): Promise<GetArtistGraphResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/graphs/artist/${encodeURIComponent(artistId)}?depth=${GRAPH_DEFAULT_DEPTH}&limit=${GRAPH_DEFAULT_LIMIT}`
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload: unknown = await response.json();

  if (!isGraphSnapshot(payload)) {
    throw new Error("Invalid graph response");
  }

  return payload;
}

export async function loadArtistInfo(input: { name: string; mbid?: string | null }): Promise<ArtistInfoResponse> {
  const params = new URLSearchParams();
  params.set("name", input.name);

  if (input.mbid) {
    params.set("mbid", input.mbid);
  }

  const response = await fetch(`${apiBaseUrl}/api/artists/info?${params.toString()}`);

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload: unknown = await response.json();

  if (!isArtistInfoResponse(payload)) {
    throw new Error("Invalid artist info response");
  }

  return payload;
}

export async function enrichGraphStructure(
  request: GraphStructureEnrichmentRequest
): Promise<PostGraphEnrichResponse> {
  const response = await fetch(`${apiBaseUrl}/api/graphs/enrich`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload: unknown = await response.json();

  if (!isGraphStructureEnrichmentResponse(payload)) {
    throw new Error("Invalid graph enrich response");
  }

  return payload;
}

export async function enrichGraphTags(request: GraphTagsEnrichmentRequest): Promise<PostGraphTagsResponse> {
  const response = await fetch(`${apiBaseUrl}/api/graphs/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload: unknown = await response.json();

  if (!isGraphTagsEnrichmentResponse(payload)) {
    throw new Error("Invalid graph tags response");
  }

  return payload;
}
