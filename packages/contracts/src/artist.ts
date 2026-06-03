export type ArtistSearchResult = {
  id: string;
  name: string;
  mbid?: string | null;
  imageUrl?: string | null;
  tags: string[];
};

export type ArtistInfoTag = {
  name: string;
  url?: string | null;
};

export type ArtistTopTrack = {
  name: string;
  playcount?: number | null;
  listeners?: number | null;
  url?: string | null;
};

export type ArtistInfo = {
  name: string;
  mbid?: string | null;
  url?: string | null;
  imageUrl?: string | null;
  listeners?: number | null;
  playcount?: number | null;
  summary?: string | null;
  tags: ArtistInfoTag[];
  topTracks: ArtistTopTrack[];
};
