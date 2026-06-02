import { Router } from "express";
import { buildArtistGraph } from "../services/graphJobs.js";

export const graphsRouter = Router();

graphsRouter.get("/artist/:artistId", async (request, response, next) => {
  try {
    const depth = Number(request.query.depth ?? 1);
    const limit = Number(request.query.limit ?? 100);

    response.json(await buildArtistGraph({ artistId: request.params.artistId, depth, limit }));
  } catch (error) {
    next(error);
  }
});

