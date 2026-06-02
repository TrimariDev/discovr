export type LastFmSimilarArtist = {
  name: string;
  mbid?: string;
  match?: string;
  url?: string;
  image?: Array<{ "#text": string; size: string }>;
};

type LastFmSimilarResponse = {
  similarartists?: {
    artist?: LastFmSimilarArtist[];
  };
  error?: number;
  message?: string;
};

const lastFmApiUrl = "https://ws.audioscrobbler.com/2.0/";

export async function getSimilarArtists(input: {
  artistName?: string;
  mbid?: string;
  limit?: number;
}): Promise<LastFmSimilarArtist[]> {
  const apiKey = process.env.LASTFM_API_KEY;

  if (!apiKey) {
    throw new Error("LASTFM_API_KEY is not configured");
  }

  const url = new URL(lastFmApiUrl);
  url.searchParams.set("method", "artist.getSimilar");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("autocorrect", "1");
  url.searchParams.set("limit", String(input.limit ?? 100));

  if (input.mbid) {
    url.searchParams.set("mbid", input.mbid);
  } else if (input.artistName) {
    url.searchParams.set("artist", input.artistName);
  } else {
    throw new Error("artistName or mbid is required");
  }

  const response = await fetchWithRetry(url);
  const payload = (await response.json()) as LastFmSimilarResponse;

  if (!response.ok || payload.error) {
    throw new Error(payload.message ?? "Last.fm request failed");
  }

  return payload.similarartists?.artist ?? [];
}

async function fetchWithRetry(url: URL, attempts = 3): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.status !== 429 && response.status < 500) {
        return response;
      }

      lastError = new Error(`Last.fm responded with ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, attempt * 300));
  }

  throw lastError instanceof Error ? lastError : new Error("Last.fm request failed");
}

