import { Router } from "express";
import type {
  GetArtistGraphResponse,
  GraphStructureEnrichmentRequest,
  GraphTagsEnrichmentRequest,
  PostGraphEnrichResponse,
  PostGraphTagsResponse
} from "@discovr/contracts";
import { buildArtistGraph, enrichGraphStructure } from "../services/graphJobs.js";
import { enrichArtistTags } from "../services/tagEnrichment.js";

export const graphsRouter = Router();

graphsRouter.get("/artist/:artistId", async (request, response, next) => {
  try {
    const depth = Number(request.query.depth ?? 1);
    const limit = Number(request.query.limit ?? 100);

    const payload: GetArtistGraphResponse = await buildArtistGraph({
      artistId: request.params.artistId,
      depth,
      limit
    });
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

graphsRouter.post("/enrich", async (request, response, next) => {
  try {
    const body = request.body as GraphStructureEnrichmentRequest;
    const graph = body?.graph;

    if (!graph || graph.status !== "ready" || graph.nodes.length === 0) {
      const payload: PostGraphEnrichResponse = {
        tagsByArtistId: {},
        nodes: [],
        edges: [],
        communities: [],
        algorithm: "noop"
      };
      response.json(payload);
      return;
    }

    const payload: PostGraphEnrichResponse = await enrichGraphStructure(graph);
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

graphsRouter.post("/tags", async (request, response, next) => {
  try {
    const body = request.body as GraphTagsEnrichmentRequest;
    const artists = Array.isArray(body?.artists) ? body.artists : [];

    if (artists.length === 0) {
      const payload: PostGraphTagsResponse = { tagsByArtistId: {} };
      response.json(payload);
      return;
    }

    const payload: PostGraphTagsResponse = {
      tagsByArtistId: await enrichArtistTags(artists)
    };
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

