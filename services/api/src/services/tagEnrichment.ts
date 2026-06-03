import type { GraphTagsEnrichmentArtistRef } from "@discovr/contracts";
import { getCached, setCached } from "./cache.js";
import { getTopTags } from "./lastfm.js";

const tagCacheTtlMs = 1000 * 60 * 30;
const concurrency = 6;
const tagsPerArtist = 8;

export async function enrichArtistTags(artists: GraphTagsEnrichmentArtistRef[]): Promise<Record<string, string[]>> {
  const tagsByArtistId: Record<string, string[]> = {};
  const queue = [...artists];
  const workers = Array.from({ length: Math.min(concurrency, queue.length || 1) }, async () => {
    while (queue.length > 0) {
      const artist = queue.shift();
      if (!artist) {
        continue;
      }

      const cacheKey = `artist-tags:${artist.id}`;
      const cached = getCached<string[]>(cacheKey);
      if (cached) {
        tagsByArtistId[artist.id] = cached;
        continue;
      }

      try {
        const topTags = await getTopTags({
          artistName: artist.name,
          mbid: artist.mbid ?? undefined,
          limit: tagsPerArtist
        });
        const tags = topTags.map((tag) => tag.name.trim()).filter(Boolean);
        tagsByArtistId[artist.id] = tags;
        setCached(cacheKey, tags, tagCacheTtlMs);
      } catch {
        tagsByArtistId[artist.id] = [];
      }
    }
  });

  await Promise.all(workers);
  return tagsByArtistId;
}
