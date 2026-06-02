export type ArtistSearchResult = {
  id: string;
  name: string;
  mbid?: string | null;
  imageUrl?: string | null;
  tags: string[];
};

export type ArtistNode = {
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

export type ArtistEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  label: string;
};

export type Community = {
  id: number;
  label: string;
  topTags: string[];
};

export type GraphSnapshot = {
  status: "idle" | "loading" | "ready" | "error";
  graphId: string | null;
  nodes: ArtistNode[];
  edges: ArtistEdge[];
  communities: Community[];
  meta: {
    seedArtistId: string | null;
    depth: number;
    limit: number;
    algorithm: string;
  };
};

