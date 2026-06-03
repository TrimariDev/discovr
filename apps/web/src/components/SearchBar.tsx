"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { titleCaseArtistName } from "@discovr/contracts";
import { loadArtistGraph, searchArtists } from "@/lib/api";
import { isEchoSearchResult, matchesSearchPrefix } from "@/lib/search";
import type { ArtistSearchResult, GraphSnapshot } from "@/lib/types";

type Props = {
  onGraphLoaded: (graph: GraphSnapshot) => void;
  onArtistSelected: (artist: Pick<ArtistSearchResult, "id" | "name" | "mbid"> | null) => void;
  onClear: () => void;
};

export function SearchBar({ onGraphLoaded, onArtistSelected, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestQueryRef = useRef("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelectionLocked, setIsSelectionLocked] = useState(false);
  const normalizedQuery = query.trim();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  latestQueryRef.current = normalizedQuery;

  const visibleResults = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return results;
    }

    return results.filter(
      (artist) =>
        !isEchoSearchResult(artist, normalizedQuery) &&
        matchesSearchPrefix(artist.name, normalizedQuery)
    );
  }, [normalizedQuery, results]);

  useEffect(() => {
    if (isSelectionLocked) {
      setResults([]);
      return;
    }

    if (normalizedQuery.length < 1) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    const queryForRequest = normalizedQuery;
    setIsSearching(true);

    const timeout = window.setTimeout(async () => {
      try {
        setError(null);
        const nextResults = await searchArtists(queryForRequest);

        if (active && latestQueryRef.current === queryForRequest) {
          setResults(nextResults);
        }
      } catch {
        if (active && latestQueryRef.current === queryForRequest) {
          setError("Search unavailable");
        }
      } finally {
        if (active && latestQueryRef.current === queryForRequest) {
          setIsSearching(false);
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
    onArtistSelected({ id: artist.id, name: artist.name, mbid: artist.mbid ?? null });
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

    // Restore focus after clearing state, so typing can resume immediately.
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  return (
    <div className="search">
      <div className="searchField" suppressHydrationWarning>
        <input
          ref={inputRef}
          aria-label="Search artist"
          autoComplete="off"
          suppressHydrationWarning
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
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
      {(visibleResults.length > 0 || error || isSearching) && (
        <ul className="searchResults panel" role="listbox" aria-label="Artist search results">
          {isSearching && <li className="searchStatus">Searching…</li>}
          {error && <li className="searchStatus">{error}</li>}
          {visibleResults.map((artist) => (
            <li key={artist.id}>
              <button type="button" onClick={() => selectArtist(artist)}>
                {titleCaseArtistName(artist.name)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
