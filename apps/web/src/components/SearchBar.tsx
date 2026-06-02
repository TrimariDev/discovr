"use client";

import { useEffect, useState } from "react";
import { loadArtistGraph, searchArtists } from "@/lib/api";
import type { ArtistNode, ArtistSearchResult, GraphSnapshot } from "@/lib/types";

type Props = {
  onGraphLoaded: (graph: GraphSnapshot) => void;
  onArtistSelected: (artist: ArtistNode | null) => void;
};

export function SearchBar({ onGraphLoaded, onArtistSelected }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setError(null);
        setResults(await searchArtists(query));
      } catch {
        setError("Search unavailable");
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query]);

  async function selectArtist(artist: ArtistSearchResult) {
    setQuery(artist.name);
    setResults([]);
    onArtistSelected(null);
    onGraphLoaded({
      status: "loading",
      graphId: null,
      nodes: [],
      edges: [],
      communities: [],
      meta: { seedArtistId: artist.id, depth: 1, limit: 100, algorithm: "loading" }
    });

    try {
      onGraphLoaded(await loadArtistGraph(artist.id));
    } catch {
      setError("Graph unavailable");
      onGraphLoaded({
        status: "error",
        graphId: null,
        nodes: [],
        edges: [],
        communities: [],
        meta: { seedArtistId: artist.id, depth: 1, limit: 100, algorithm: "error" }
      });
    }
  }

  return (
    <div className="search">
      <input
        aria-label="Search artist"
        placeholder="Search an artist"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {(results.length > 0 || error) && (
        <ul className="searchResults panel">
          {error && <li>{error}</li>}
          {results.map((artist) => (
            <li key={artist.id}>
              <button type="button" onClick={() => selectArtist(artist)}>
                {artist.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

