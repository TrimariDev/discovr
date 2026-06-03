/** Normalize artist names and search queries for case-insensitive matching. */
export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const compactAlphanumeric = (value: string) => value.replace(/[^a-z0-9]+/g, "");

/** Drop rows that mirror the literal typed query (Last.fm / cache echo). */
export function isEchoSearchResult(
  artist: { id: string; name: string },
  query: string
) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return false;
  }

  const normalizedName = normalizeSearchText(artist.name);
  const normalizedId = normalizeSearchText(artist.id);

  if (normalizedName === normalizedQuery || normalizedId === normalizedQuery) {
    return true;
  }

  return (
    compactAlphanumeric(normalizedName) === compactAlphanumeric(normalizedQuery) ||
    compactAlphanumeric(normalizedId) === compactAlphanumeric(normalizedQuery)
  );
}

function splitWords(value: string) {
  return normalizeSearchText(value).split(/\s+/).filter(Boolean);
}

/** Each query token prefix-matches the next consecutive word in the candidate. */
export function matchesSearchTokens(candidate: string, query: string) {
  const queryTokens = splitWords(query);
  const candidateWords = splitWords(candidate);

  if (queryTokens.length === 0) {
    return true;
  }

  if (queryTokens.length > candidateWords.length) {
    return false;
  }

  for (let start = 0; start <= candidateWords.length - queryTokens.length; start += 1) {
    let aligned = true;

    for (let index = 0; index < queryTokens.length; index += 1) {
      if (!candidateWords[start + index].startsWith(queryTokens[index])) {
        aligned = false;
        break;
      }
    }

    if (aligned) {
      return true;
    }
  }

  return false;
}

/**
 * Match quality for ranking (lower is better).
 * 0 = exact, 1 = prefix (full name, single word, or token sequence), 2 = substring, 3 = no match.
 */
export function searchMatchScore(query: string, candidate: string) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedCandidate = normalizeSearchText(candidate);

  if (!normalizedQuery) {
    return 0;
  }

  if (normalizedCandidate === normalizedQuery) {
    return 0;
  }

  const words = splitWords(candidate);

  if (
    normalizedCandidate.startsWith(normalizedQuery) ||
    words.some((word) => word.startsWith(normalizedQuery)) ||
    matchesSearchTokens(candidate, query)
  ) {
    return 1;
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return 2;
  }

  return 3;
}

/** Whether the candidate should appear for this query (prefix or token-prefix match). */
export function matchesSearchQuery(candidate: string, query: string) {
  return searchMatchScore(query, candidate) <= 1;
}

/** Suffix variants to recover Last.fm autocomplete gaps (e.g. cranberr → cranberri). */
export const SEARCH_QUERY_SUFFIXES = ["i", "s", "es", "ies", "e", "les"] as const;

export const SEARCH_SUPPLEMENT_MIN_QUERY_LENGTH = 4;
export const SEARCH_SUPPLEMENT_MAX_EXTRA_QUERIES = 5;

/** Extra Last.fm queries when the primary string under-delivers (no manual artist list). */
export function buildSupplementalSearchQueries(query: string): string[] {
  const normalized = normalizeSearchText(query);
  const parts = splitWords(normalized);
  const out = new Set<string>();

  if (parts.length === 0 || normalized.length < SEARCH_SUPPLEMENT_MIN_QUERY_LENGTH) {
    return [];
  }

  if (parts.length === 1) {
    for (const suffix of SEARCH_QUERY_SUFFIXES) {
      out.add(parts[0] + suffix);
    }
    return [...out];
  }

  const prefix = parts.slice(0, -1).join(" ");
  const last = parts[parts.length - 1];

  for (const suffix of SEARCH_QUERY_SUFFIXES) {
    out.add(`${prefix} ${last}${suffix}`);
  }

  return [...out];
}
