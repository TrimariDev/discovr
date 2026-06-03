export type GraphNode = {
  id: string;
  label: string;
  name: string;
  x: number;
  y: number;
  size: number;
  community: number;
  tags: string[];
  imageUrl?: string | null;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  label: string;
};

export type GraphCommunity = {
  id: number;
  label: string;
  topTags: string[];
};

export type GraphMeta = {
  seedArtistId: string;
  depth: number;
  limit: number;
  algorithm: string;
};

/** Successful graph payload returned by the API (status is always "ready" today). */
export type GraphSnapshot = {
  status: "ready";
  graphId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  communities: GraphCommunity[];
  meta: GraphMeta;
};

export type GraphTagsEnrichmentArtistRef = {
  id: string;
  name: string;
  mbid?: string | null;
};

export type GraphTagsEnrichmentRequest = {
  artists: GraphTagsEnrichmentArtistRef[];
};

export type GraphTagsEnrichmentResponse = {
  tagsByArtistId: Record<string, string[]>;
};

/** POST /api/graphs/enrich — async tag edges + Leiden after fast graph load. */
export type GraphStructureEnrichmentRequest = {
  graph: GraphSnapshot;
};

export type GraphStructureEnrichmentResponse = {
  tagsByArtistId: Record<string, string[]>;
  nodes: GraphNode[];
  edges: GraphEdge[];
  communities: GraphCommunity[];
  algorithm: string;
};
