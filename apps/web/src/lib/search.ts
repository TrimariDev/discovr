import type { ArtistSearchResult } from "@/lib/types";

export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Drop rows that mirror the literal typed query (Last.fm / cache echo). */
export function isEchoSearchResult(artist: Pick<ArtistSearchResult, "id" | "name">, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return false;
  }

  const normalizedName = normalizeSearchText(artist.name);
  const normalizedId = normalizeSearchText(artist.id);

  if (normalizedName === normalizedQuery || normalizedId === normalizedQuery) {
    return true;
  }

  const compact = (value: string) => value.replace(/[^a-z0-9]+/g, "");

  return (
    compact(normalizedName) === compact(normalizedQuery) ||
    compact(normalizedId) === compact(normalizedQuery)
  );
}

/** Full query must prefix-match the artist name or one of its words (not a shorter shared stem). */
export function matchesSearchPrefix(candidate: string, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const normalizedCandidate = normalizeSearchText(candidate);
  const words = normalizedCandidate.split(/\s+/).filter(Boolean);

  return (
    normalizedCandidate.startsWith(normalizedQuery) ||
    words.some((word) => word.startsWith(normalizedQuery))
  );
}
