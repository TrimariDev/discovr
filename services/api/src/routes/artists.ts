import { Router } from "express";
import type { ApiErrorResponse, ArtistInfoResponse, ArtistSearchResponse } from "@discovr/contracts";
import { bootstrapArtistSearch } from "../services/graphJobs.js";
import { getCached, setCached } from "../services/cache.js";
import { getArtistInfo, getTopTracks } from "../services/lastfm.js";

export const artistsRouter = Router();

artistsRouter.get("/search", async (request, response, next) => {
  try {
    const query = String(request.query.q ?? "").trim();

    if (query.length < 1) {
      const payload: ArtistSearchResponse = { results: [] };
      response.json(payload);
      return;
    }

    const payload: ArtistSearchResponse = { results: await bootstrapArtistSearch(query) };
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

artistsRouter.get("/info", async (request, response, next) => {
  try {
    const name = String(request.query.name ?? "").trim();
    const mbid = String(request.query.mbid ?? "").trim();

    if (!name && !mbid) {
      const payload: ApiErrorResponse = { error: { message: "name or mbid is required" } };
      response.status(400).json(payload);
      return;
    }

    const cacheKey = `artist-info:${mbid || name.toLowerCase()}`;
    const cached = getCached<ArtistInfoResponse>(cacheKey);

    if (cached) {
      response.json(cached);
      return;
    }

    const [info, tracks] = await Promise.all([
      getArtistInfo({ artistName: name || undefined, mbid: mbid || undefined }),
      getTopTracks({ artistName: name || undefined, mbid: mbid || undefined, limit: 8 })
    ]);

    const imageUrl = info.image?.find((image) => image.size === "extralarge")?.["#text"] ||
      info.image?.find((image) => image.size === "large")?.["#text"] ||
      info.image?.find((image) => image["#text"])?.["#text"] ||
      null;

    const payload: ArtistInfoResponse = {
      artist: {
        name: info.name,
        mbid: info.mbid || null,
        url: info.url || null,
        imageUrl,
        listeners: info.stats?.listeners ? Number(info.stats.listeners) : null,
        playcount: info.stats?.playcount ? Number(info.stats.playcount) : null,
        summary: info.bio?.summary ?? null,
        tags: info.tags?.tag?.map((tag) => ({ name: tag.name, url: tag.url ?? null })) ?? [],
        topTracks: tracks
          .filter((track) => track.name?.trim())
          .slice(0, 8)
          .map((track) => ({
            name: track.name,
            playcount: track.playcount ? Number(track.playcount) : null,
            listeners: track.listeners ? Number(track.listeners) : null,
            url: track.url ?? null
          }))
      }
    };

    setCached(cacheKey, payload, 1000 * 60 * 30);
    response.json(payload);
  } catch (error) {
    next(error);
  }
});
