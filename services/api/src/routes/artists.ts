import { Router } from "express";
import { bootstrapArtistSearch } from "../services/graphJobs.js";

export const artistsRouter = Router();

artistsRouter.get("/search", async (request, response, next) => {
  try {
    const query = String(request.query.q ?? "").trim();

    if (query.length < 2) {
      response.json({ results: [] });
      return;
    }

    response.json({ results: await bootstrapArtistSearch(query) });
  } catch (error) {
    next(error);
  }
});

