export type LastFmSimilarArtist = {
  name: string;
  mbid?: string;
  match?: string;
  url?: string;
  image?: Array<{ "#text": string; size: string }>;
};

export type LastFmArtistSearchResult = {
  name: string;
  mbid?: string;
  url?: string;
  image?: Array<{ "#text": string; size: string }>;
  listeners?: string;
};

export type LastFmArtistInfo = {
  name: string;
  mbid?: string;
  url?: string;
  image?: Array<{ "#text": string; size: string }>;
  stats?: {
    listeners?: string;
    playcount?: string;
  };
  bio?: {
    summary?: string;
  };
  tags?: {
    tag?: Array<{ name: string; url?: string }>;
  };
};

export type LastFmTopTrack = {
  name: string;
  playcount?: string;
  listeners?: string;
  url?: string;
};

export type LastFmTopTag = {
  name: string;
  count?: string;
  url?: string;
};

type LastFmSimilarResponse = {
  similarartists?: {
    artist?: LastFmSimilarArtist[];
  };
  error?: number;
  message?: string;
};

type LastFmArtistInfoResponse = {
  artist?: LastFmArtistInfo;
  error?: number;
  message?: string;
};

type LastFmArtistSearchResponse = {
  results?: {
    artistmatches?: {
      artist?: LastFmArtistSearchResult | LastFmArtistSearchResult[];
    };
  };
  error?: number;
  message?: string;
};

type LastFmTopTracksResponse = {
  toptracks?: {
    track?: LastFmTopTrack[] | LastFmTopTrack;
  };
  error?: number;
  message?: string;
};

type LastFmTopTagsResponse = {
  toptags?: {
    tag?: LastFmTopTag[] | LastFmTopTag;
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

export async function getArtistInfo(input: { artistName?: string; mbid?: string }): Promise<LastFmArtistInfo> {
  const apiKey = process.env.LASTFM_API_KEY;

  if (!apiKey) {
    throw new Error("LASTFM_API_KEY is not configured");
  }

  const url = new URL(lastFmApiUrl);
  url.searchParams.set("method", "artist.getInfo");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("autocorrect", "1");

  if (input.mbid) {
    url.searchParams.set("mbid", input.mbid);
  } else if (input.artistName) {
    url.searchParams.set("artist", input.artistName);
  } else {
    throw new Error("artistName or mbid is required");
  }

  const response = await fetchWithRetry(url);
  const payload = (await response.json()) as LastFmArtistInfoResponse;

  if (!response.ok || payload.error || !payload.artist) {
    throw new Error(payload.message ?? "Last.fm artist info failed");
  }

  return payload.artist;
}

export async function getTopTracks(input: {
  artistName?: string;
  mbid?: string;
  limit?: number;
}): Promise<LastFmTopTrack[]> {
  const apiKey = process.env.LASTFM_API_KEY;

  if (!apiKey) {
    throw new Error("LASTFM_API_KEY is not configured");
  }

  const url = new URL(lastFmApiUrl);
  url.searchParams.set("method", "artist.getTopTracks");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("autocorrect", "1");
  url.searchParams.set("limit", String(input.limit ?? 8));

  if (input.mbid) {
    url.searchParams.set("mbid", input.mbid);
  } else if (input.artistName) {
    url.searchParams.set("artist", input.artistName);
  } else {
    throw new Error("artistName or mbid is required");
  }

  const response = await fetchWithRetry(url);
  const payload = (await response.json()) as LastFmTopTracksResponse;

  if (!response.ok || payload.error) {
    throw new Error(payload.message ?? "Last.fm top tracks failed");
  }

  const tracks = payload.toptracks?.track ?? [];
  return Array.isArray(tracks) ? tracks : [tracks];
}

export async function getTopTags(input: {
  artistName?: string;
  mbid?: string;
  limit?: number;
}): Promise<LastFmTopTag[]> {
  const apiKey = process.env.LASTFM_API_KEY;

  if (!apiKey) {
    throw new Error("LASTFM_API_KEY is not configured");
  }

  const url = new URL(lastFmApiUrl);
  url.searchParams.set("method", "artist.getTopTags");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("autocorrect", "1");
  url.searchParams.set("limit", String(input.limit ?? 8));

  if (input.mbid) {
    url.searchParams.set("mbid", input.mbid);
  } else if (input.artistName) {
    url.searchParams.set("artist", input.artistName);
  } else {
    throw new Error("artistName or mbid is required");
  }

  const response = await fetchWithRetry(url);
  const payload = (await response.json()) as LastFmTopTagsResponse;

  if (!response.ok || payload.error) {
    throw new Error(payload.message ?? "Last.fm top tags failed");
  }

  const tags = payload.toptags?.tag ?? [];
  return Array.isArray(tags) ? tags : [tags];
}

export async function searchArtists(input: {
  query: string;
  limit?: number;
}): Promise<LastFmArtistSearchResult[]> {
  const apiKey = process.env.LASTFM_API_KEY;

  if (!apiKey) {
    throw new Error("LASTFM_API_KEY is not configured");
  }

  const url = new URL(lastFmApiUrl);
  url.searchParams.set("method", "artist.search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("artist", input.query);
  url.searchParams.set("limit", String(input.limit ?? 12));

  const response = await fetchWithRetry(url);
  const payload = (await response.json()) as LastFmArtistSearchResponse;

  if (!response.ok || payload.error) {
    throw new Error(payload.message ?? "Last.fm artist search failed");
  }

  const artists = payload.results?.artistmatches?.artist ?? [];
  return Array.isArray(artists) ? artists : [artists];
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
