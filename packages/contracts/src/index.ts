export type {
  ArtistInfo,
  ArtistInfoTag,
  ArtistSearchResult,
  ArtistTopTrack
} from "./artist.js";

export type { ExplainEdgeResponse } from "./edge.js";

export type {
  GraphCommunity,
  GraphEdge,
  GraphMeta,
  GraphNode,
  GraphSnapshot,
  GraphStructureEnrichmentRequest,
  GraphStructureEnrichmentResponse,
  GraphTagsEnrichmentArtistRef,
  GraphTagsEnrichmentRequest,
  GraphTagsEnrichmentResponse
} from "./graph.js";

export type {
  ApiErrorResponse,
  ArtistInfoResponse,
  ArtistSearchResponse,
  GetArtistGraphResponse,
  HealthCheckResponse,
  PostGraphEnrichResponse,
  PostGraphTagsResponse
} from "./api.js";

export {
  apiRoutes,
  isApiErrorResponse,
  isArtistInfoResponse,
  isArtistSearchResponse,
  isGraphSnapshot,
  isExplainEdgeResponse,
  isGraphStructureEnrichmentResponse,
  isGraphTagsEnrichmentResponse
} from "./api.js";

export { titleCaseArtistName } from "./format.js";

export {
  buildSupplementalSearchQueries,
  isEchoSearchResult,
  matchesSearchQuery,
  matchesSearchTokens,
  normalizeSearchText,
  searchMatchScore,
  SEARCH_QUERY_SUFFIXES,
  SEARCH_SUPPLEMENT_MAX_EXTRA_QUERIES,
  SEARCH_SUPPLEMENT_MIN_QUERY_LENGTH
} from "./search.js";
