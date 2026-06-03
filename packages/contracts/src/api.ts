import type { ArtistInfo, ArtistSearchResult } from "./artist.js";
import type { ExplainEdgeResponse } from "./edge.js";
import type {
  GraphSnapshot,
  GraphStructureEnrichmentRequest,
  GraphStructureEnrichmentResponse,
  GraphTagsEnrichmentRequest,
  GraphTagsEnrichmentResponse
} from "./graph.js";

/** GET /health */
export type HealthCheckResponse = {
  status: "ok";
  service: string;
};

/** Shared error body for 4xx/5xx JSON responses. */
export type ApiErrorResponse = {
  error: {
    message: string;
  };
};

/** GET /api/artists/search?q= */
export type ArtistSearchResponse = {
  results: ArtistSearchResult[];
};

/** GET /api/artists/info?name=&mbid= */
export type ArtistInfoResponse = {
  artist: ArtistInfo;
};

/** GET /api/graphs/artist/:artistId?depth=&limit= */
export type GetArtistGraphResponse = GraphSnapshot;

/** POST /api/graphs/tags */
export type PostGraphTagsResponse = GraphTagsEnrichmentResponse;

/** POST /api/graphs/enrich */
export type PostGraphEnrichResponse = GraphStructureEnrichmentResponse;

/** GET /api/edges/explain */
export type { ExplainEdgeResponse };

export type {
  GraphStructureEnrichmentRequest,
  GraphStructureEnrichmentResponse,
  GraphTagsEnrichmentRequest,
  GraphTagsEnrichmentResponse
};

/** Documented HTTP surface for the MVP API (database-free). */
export const apiRoutes = {
  health: { method: "GET", path: "/health", response: "HealthCheckResponse" },
  artistSearch: { method: "GET", path: "/api/artists/search", response: "ArtistSearchResponse" },
  artistInfo: { method: "GET", path: "/api/artists/info", response: "ArtistInfoResponse" },
  artistGraph: { method: "GET", path: "/api/graphs/artist/:artistId", response: "GetArtistGraphResponse" },
  graphTags: { method: "POST", path: "/api/graphs/tags", response: "PostGraphTagsResponse" },
  graphEnrich: { method: "POST", path: "/api/graphs/enrich", response: "PostGraphEnrichResponse" },
  explainEdge: { method: "GET", path: "/api/edges/explain", response: "ExplainEdgeResponse" }
} as const;

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const error = (value as ApiErrorResponse).error;

  return Boolean(error && typeof error.message === "string");
}

export function isArtistSearchResponse(value: unknown): value is ArtistSearchResponse {
  return Boolean(value && typeof value === "object" && Array.isArray((value as ArtistSearchResponse).results));
}

export function isArtistInfoResponse(value: unknown): value is ArtistInfoResponse {
  const artist = value && typeof value === "object" ? (value as ArtistInfoResponse).artist : null;

  return Boolean(artist && typeof artist.name === "string");
}

export function isGraphSnapshot(value: unknown): value is GraphSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as GraphSnapshot;

  return (
    snapshot.status === "ready" &&
    typeof snapshot.graphId === "string" &&
    Array.isArray(snapshot.nodes) &&
    Array.isArray(snapshot.edges) &&
    Array.isArray(snapshot.communities) &&
    snapshot.meta !== null &&
    typeof snapshot.meta === "object"
  );
}

export function isGraphTagsEnrichmentResponse(value: unknown): value is GraphTagsEnrichmentResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as GraphTagsEnrichmentResponse).tagsByArtistId === "object"
  );
}

export function isExplainEdgeResponse(value: unknown): value is ExplainEdgeResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as ExplainEdgeResponse;

  return typeof payload.score === "number" && Array.isArray(payload.reasons);
}

export function isGraphStructureEnrichmentResponse(value: unknown): value is GraphStructureEnrichmentResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const patch = value as GraphStructureEnrichmentResponse;

  return (
    typeof patch.tagsByArtistId === "object" &&
    Array.isArray(patch.nodes) &&
    Array.isArray(patch.edges) &&
    Array.isArray(patch.communities) &&
    typeof patch.algorithm === "string"
  );
}
