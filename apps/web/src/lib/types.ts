import type {
  ArtistSearchResult,
  ArtistInfo,
  ArtistInfoResponse,
  GetArtistGraphResponse,
  GraphCommunity,
  GraphEdge,
  GraphNode
} from "@discovr/contracts";

export type { ArtistInfo, ArtistInfoResponse, ArtistSearchResult, GraphCommunity, GraphEdge, GraphNode };

export type ArtistNode = GraphNode;
export type ArtistEdge = GraphEdge;
export type Community = GraphCommunity;

export type GraphSnapshot =
  | GetArtistGraphResponse
  | {
      status: "idle" | "loading" | "error";
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
