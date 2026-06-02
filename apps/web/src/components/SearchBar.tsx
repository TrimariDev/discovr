"use client";

import { useEffect, useState } from "react";
import { loadArtistGraph, searchArtists } from "@/lib/api";
import type { ArtistNode, ArtistSearchResult, GraphSnapshot } from "@/lib/types";

type Props = {
  onGraphLoaded: (graph: GraphSnapshot) => void;
  onArtistSelected: (artist: ArtistNode | null) => void;
  onClear: () => void;
};

export function SearchBar({ onGraphLoaded, onArtistSelected, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSelectionLocked, setIsSelectionLocked] = useState(false);
  const normalizedQuery = query.trim();

  useEffect(() => {
    if (isSelectionLocked) {
      setResults([]);
      return;
    }

    if (normalizedQuery.length < 1) {
      setResults([]);
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      try {
        setError(null);
        const nextResults = await searchArtists(normalizedQuery);

        if (active) {
          setResults(nextResults);
        }
      } catch {
        if (active) {
          setError("Search unavailable");
        }
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [isSelectionLocked, normalizedQuery]);

  async function selectArtist(artist: ArtistSearchResult) {
    setIsSelectionLocked(true);
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

  function clearSearch() {
    setQuery("");
    setResults([]);
    setError(null);
    setIsSelectionLocked(false);
    onArtistSelected(null);
    onClear();
  }

  return (
    <div className="search">
      <div className="searchField">
        <input
          aria-label="Search artist"
          autoComplete="off"
          placeholder="Search an artist"
          value={query}
          onChange={(event) => {
            setIsSelectionLocked(false);
            setError(null);
            setQuery(event.target.value);
          }}
        />
        {(normalizedQuery.length > 0 || isSelectionLocked) && (
          <button type="button" className="searchClear" aria-label="Clear search" onClick={clearSearch}>
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
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
