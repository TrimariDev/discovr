export type ArtistSearchResult = {
  id: string;
  name: string;
  mbid?: string | null;
  imageUrl?: string | null;
  tags: string[];
};

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

export type GraphSnapshot = {
  status: "ready";
  graphId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  communities: GraphCommunity[];
  meta: {
    seedArtistId: string;
    depth: number;
    limit: number;
    algorithm: string;
  };
};

